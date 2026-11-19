import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const api = process.env.API_BASE_URL || 'http://127.0.0.1:3002/api/v1'

async function login(page: Page, request: APIRequestContext) {
  const health = await (await request.get(new URL('/health', api).href)).json()
  expect(new URL(api).hostname).toBe('127.0.0.1')
  expect(health.env).toBe('test')
  expect(health.db).toBe('ok')
  const response = await request.post(api + '/auth/login', { data: {
    username: process.env.GRAEL_TEST_USER, password: process.env.GRAEL_TEST_PASSWORD,
  } })
  expect(response.ok()).toBe(true)
  const { access_token, user } = await response.json()
  expect(user.rol).toBe('SUPERADMIN')
  await page.addInitScript(({ user, token }) => {
    sessionStorage.setItem('grael-auth', JSON.stringify({ state: { user, token, isAuthenticated: true, hydrated: true }, version: 0 }))
  }, { user, token: access_token })
  return { Authorization: 'Bearer ' + access_token }
}

test.describe('Operaciones con PostgreSQL aislado', () => {
  test.skip(!process.env.GRAEL_TEST_USER || !process.env.GRAEL_TEST_PASSWORD, 'Requiere una cuenta de la base aislada')

  test('recepción guarda desde el formulario y búsqueda recupera el mismo ticket', async ({ page, request }) => {
    const headers = await login(page, request)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const destinations = await (await request.get(api + '/destinos', { headers })).json()
    const origin = destinations.find((d: { codigo: string }) => d.codigo === 'LIM')
    const destination = destinations.find((d: { codigo: string }) => d.codigo === 'CUS')
    const { data } = await (await request.get(api + '/tickets?limit=1', { headers })).json()
    const { remitente, destinatario } = data[0]
    await page.goto('/recepcion')
    await page.locator('select[name="origenId"]').selectOption(origin.id)
    await page.locator('select[name="destinoId"]').selectOption(destination.id)
    for (const [prefix, cliente] of [['remitente', remitente], ['destinatario', destinatario]] as const) {
      await page.locator('[name="' + prefix + 'TipoDoc"]').selectOption(cliente.ruc ? 'RUC' : 'DNI')
      await page.locator('[name="' + prefix + 'Doc"]').fill(cliente.ruc || cliente.dni)
      await page.locator('[name="' + prefix + 'Nombre"]').fill(cliente.razonSocial)
    }
    await page.getByLabel('Tipo de mercadería', { exact: true }).selectOption({ label: 'CARGA GENERAL' })
    await page.getByLabel('Peso total (kg)').fill('1.5')
    await page.getByPlaceholder('Ej: Repuestos industriales').fill('Mercadería de verificación UI')
    await page.getByRole('button', { name: 'Agregar', exact: true }).last().click()
    const saving = page.waitForResponse(r => r.url().endsWith('/tickets') && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    const saved = await saving
    expect(saved.status(), await saved.text()).toBe(201)
    const ticket = await saved.json()
    const persisted = await (await request.get(api + '/tickets/' + ticket.id, { headers })).json()
    expect(persisted.numeroTicket).toBe(ticket.numeroTicket)
    expect(persisted.total).toBeGreaterThan(0)
    expect(persisted.mercaderias[0].descripcion).toBe('Mercadería de verificación UI')
    await page.goto('/busqueda?ticket=' + ticket.id)
    await expect(page.getByRole('dialog').getByText(ticket.numeroTicket, { exact: true })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('las pantallas operativas consultan la API sin excepciones de navegador ni respuestas fallidas', async ({ page, request }) => {
    test.setTimeout(100_000)
    await login(page, request)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    page.on('response', r => { if (r.url().includes('/api/v1/') && r.status() >= 400) errors.push(r.status() + ' ' + new URL(r.url()).pathname) })
    for (const route of ['dashboard', 'recepcion', 'busqueda', 'busqueda-qr', 'manifiesto', 'bolsa', 'inventario', 'transbordo', 'desembarque', 'reparto', 'entregas', 'incidencias', 'caja-diaria', 'egresos', 'pago-sin-comprobante', 'guias', 'comprobantes', 'detraccion', 'reportes', 'auditoria', 'configuracion']) {
      await page.goto('/' + route)
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(new RegExp('/' + route + '$'))
      await expect(page.getByRole('main')).toBeVisible()
    }
    expect(errors).toEqual([])
  })
})
