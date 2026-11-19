import { expect, test, type Page } from '@playwright/test'

const user = { id: 'qa-admin', username: 'qa', nombre: 'Pruebas', apellido: 'UI', sede: 'QA', sedeId: 'qa-site', rol: 'ADMIN_SEDE' }

async function session(page: Page) {
  await page.addInitScript(({ user }) => {
    sessionStorage.setItem('grael-auth', JSON.stringify({
      state: { user, token: 'regression-fixture', isAuthenticated: true, hydrated: true }, version: 0,
    }))
  }, { user })
  await page.route('**/api/v1/auth/me', route => route.fulfill({ json: user }))
}

test('dashboard conserva los centavos y la identidad de cada desembarque al reordenar', async ({ page }) => {
  await session(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const ticket = { id: 't-1', numeroTicket: 'QA-100', estado: 'PENDIENTE', total: '1234.50', origen: { nombre: 'A' },
    destino: { nombre: 'B' }, remitente: { razonSocial: 'Origen QA' }, destinatario: { razonSocial: 'Destino QA' }, bultos: [] }
  await page.route('**/api/v1/reportes/dashboard*', route => route.fulfill({ json: {
    hoy: 1, cobradoHoy: '12.05', pendientesCobro: 2, montoPendiente: '3.60', enTransito: 0, desembarque: 2, cobrosHoy: 1, porMetodoHoy: [],
  } }))
  await page.route('**/api/v1/reportes/resumen-mes*', route => route.fulfill({ json: { tickets: { total: 1 }, ingresos: { total: '12.05' } } }))
  await page.route('**/api/v1/tickets?*', route => route.fulfill({ json: { data: [ticket], total: 1 } }))
  let reversed = false
  await page.route('**/api/v1/desembarque?*', route => {
    const data = ['A', 'B'].map(code => ({ id: 'desc-' + code, estado: 'PENDIENTE_VERIFICACION',
      ticket: { ...ticket, numeroTicket: 'DESC-' + code } }))
    return route.fulfill({ json: { total: data.length, data: reversed ? data.reverse() : data } })
  })
  await page.goto('/dashboard')
  await expect(page.getByText('S/ 1,234.50', { exact: true })).toBeVisible()
  await expect(page.getByText('DESC-A', { exact: true })).toBeVisible()
  const first = page.getByText('DESC-A', { exact: true })
  await first.evaluate(element => { element.setAttribute('data-regresion', 'original') })
  reversed = true
  await page.getByRole('button', { name: /actualizar/i }).click()
  await expect(page.getByText(/^DESC-[AB]$/).first()).toHaveText('DESC-B')
  await expect(first).toHaveAttribute('data-regresion', 'original')
  expect(errors).toEqual([])
})

test('dashboard distingue consulta fallida, carga y lista vacía', async ({ page }) => {
  await session(page)
  let fail = true
  await page.route('**/api/v1/reportes/dashboard*', route => route.fulfill({ status: fail ? 503 : 200,
    json: fail ? { message: 'Reporte temporalmente inaccesible' } : { hoy: 0, pendientesCobro: 0, cobradoHoy: 0, montoPendiente: 0, enTransito: 0, desembarque: 0 } }))
  await page.route('**/api/v1/reportes/resumen-mes*', route => route.fulfill({ json: { tickets: { total: 0 }, ingresos: { total: 0 } } }))
  await page.route(/\/api\/v1\/(tickets|desembarque)\?/, route => route.fulfill({ json: { data: [], total: 0 } }))
  await page.goto('/dashboard')
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Reporte temporalmente inaccesible')
  await expect(page.getByText('Actividad reciente')).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText('Sin tickets registrados.')).toBeVisible()
  await expect(page.getByText('Sin desembarques pendientes.')).toBeVisible()
})

test('el tracking de un visitante usa la API pública', async ({ page }) => {
  await page.route('**/api/v1/tracking/public/QA-TRACK', route => route.fulfill({ json: {
    codigo: 'QA-TRACK', origen: 'CUSCO', destino: 'JULIACA', estado: 'EN_TRANSITO',
    eventos: [{ id: 'evento-qa', tipoEvento: 'DESPACHADO', fechaHora: '2026-08-24T12:00:00Z' }],
  } }))
  await page.goto('/tracking')
  await page.getByPlaceholder('Ej. 301-0631089').fill('QA-TRACK')
  await page.getByRole('button', { name: 'Consultar' }).click()
  await expect(page.getByText('DESPACHADO', { exact: true })).toBeVisible()
  await expect(page.getByText('MODO DEMO', { exact: true })).toHaveCount(0)
})
