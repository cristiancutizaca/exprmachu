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

  test('configuración guarda la sede elegida y no actualiza otras sedes ni tarifas', async ({ page, request }) => {
    const headers = await login(page, request)
    const response = await request.get(api + '/sedes?activo=true', { headers })
    expect(response.ok()).toBe(true)
    const [other, target] = await response.json()
    const direccion = 'Dirección QA ' + Date.now()
    const writes: string[] = []
    page.on('request', req => {
      if (req.url().includes('/api/v1/') && ['POST', 'PATCH'].includes(req.method())) writes.push(new URL(req.url()).pathname)
    })
    await page.goto('/configuracion')
    await page.getByLabel('Sede a configurar').selectOption(target.id)
    await page.getByLabel('Dirección de la sede').fill(direccion)
    const saving = page.waitForResponse(r => r.url().endsWith('/sedes/' + target.id) && r.request().method() === 'PATCH')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    expect((await saving).ok()).toBe(true)
    await expect(page.getByText('Configuración guardada en el API')).toBeVisible()
    expect(writes).toEqual(['/api/v1/sedes/' + target.id])
    const actual = await (await request.get(api + '/sedes?activo=true', { headers })).json()
    expect(actual.find((site: { id: string }) => site.id === target.id).direccion).toBe(direccion)
    expect(actual.find((site: { id: string }) => site.id === other.id).direccion).toBe(other.direccion)
  })

  test('reparto guarda POD, devuelve el bulto pendiente y permite reasignarlo', async ({ page, request }) => {
    const headers = await login(page, request)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const get = async (path: string) => (await request.get(api + path, { headers })).json()
    const post = async (path: string, data?: Record<string, unknown>) => {
      const response = await request.post(api + path, { headers, data })
      expect(response.ok(), await response.text()).toBe(true)
      return response.json()
    }
    const sites = await get('/destinos')
    const origin = sites.find((site: { codigo: string }) => site.codigo === 'LIM')
    const dest = sites.find((site: { codigo: string }) => site.codigo === 'CUS')
    const { data: [sample] } = await get('/tickets?limit=1')
    const fleet = await get('/vehiculos?estado=ACTIVO')
    const drivers = await get('/conductores?estado=ACTIVO')
    const vehicle = fleet.find((item: { sedeId?: string }) => !item.sedeId || item.sedeId === origin.sedeId)
    const driver = drivers.find((item: { sedeId?: string }) => !item.sedeId || item.sedeId === origin.sedeId)
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
    const created = await post('/tickets', { sedeRecepcionId: origin.sedeId, origenId: origin.id, destinoId: dest.id,
      fechaViaje: date, remitenteId: sample.remitente.id, destinatarioId: sample.destinatario.id, tipoPago: 'DESTINO', tipoEntrega: 'REPARTO',
      guiasRemision: [], mercaderias: [{ tipo: 'CARGA GENERAL', pesoTotal: 2 }], numeroBultos: 2 })
    const { bultos } = await get('/tickets/' + created.id)
    expect(bultos).toHaveLength(2)
    const location = async (sedeId: string) => {
      const [warehouse] = await get('/almacenes?estado=ACTIVO&sedeId=' + sedeId)
      const [position] = await get('/almacenes/' + warehouse.id + '/ubicaciones')
      return { almacenDestinoId: warehouse.id, ubicacionDestinoId: position.id }
    }
    const originLocation = await location(origin.sedeId)
    const targetLocation = await location(dest.sedeId)
    const manifest = await post('/manifiesto', { sedeOrigenId: origin.sedeId, sedeDestinoId: dest.sedeId, origenId: origin.id,
      destinoId: dest.id, fechaViaje: date, vehiculoId: vehicle.id, conductorId: driver.id })
    const route = '/manifiesto/' + manifest.id
    for (const bulto of bultos) await post('/inventario/movimientos', { ...originLocation, bultoId: bulto.id, tipo: 'INGRESO', motivo: 'Pruebas' })
    await post(route + '/tickets', { ticketIds: [created.id] })
    for (const bulto of bultos) await post(route + '/carga/bulto', { codigo: bulto.codigo })
    await post(route + '/despachar')
    await post(route + '/llegada')
    const unloading = await post('/desembarque/sesiones', { ...targetLocation, manifiestoId: manifest.id })
    for (const bulto of bultos) await post('/desembarque/sesiones/' + unloading.id + '/bultos', { codigo: bulto.codigo, estado: 'RECIBIDO' })
    await post('/desembarque/sesiones/' + unloading.id + '/cerrar', {})

    await page.goto('/reparto')
    await page.getByRole('button', { name: 'Nueva planilla', exact: true }).click()
    await page.getByLabel('Sede de custodia').selectOption(dest.sedeId)
    const resources = await get('/reparto/recursos?sedeId=' + dest.sedeId)
    const assignments = { vehiculoId: resources.vehiculos[0].id, repartidorId: resources.repartidores[0].id }
    await page.getByLabel('Vehículo').selectOption(assignments.vehiculoId)
    await page.getByLabel('Repartidor').selectOption(assignments.repartidorId)
    await page.getByLabel('Tickets de reparto').fill(created.numeroTicket)
    const saving = page.waitForResponse(r => r.url().endsWith('/reparto') && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Crear planilla' }).click()
    const saveResponse = await saving
    expect(saveResponse.ok(), await saveResponse.text()).toBe(true)
    const sheet = await saveResponse.json()
    await page.getByRole('button', { name: 'Iniciar', exact: true }).click()

    const delivered = sheet.detalles[0]
    page.on('dialog', async dialog => {
      const value = dialog.message().includes('Nombre') ? 'Receptor de prueba UI' : dialog.message().includes('Documento') ? '12345678' : 'POD verificado'
      await dialog.accept(value)
    })
    await page.getByRole('button', { name: 'Entregado', exact: true }).first().click()
    await expect(page.getByText('Intento registrado')).toBeVisible()
    const pod = await get('/entregas?bultoId=' + delivered.bultoId)
    expect(pod[0].estado).toBe('ENTREGADA')
    expect(pod[0].documentoReceptor).toBe('12345678')

    await page.getByRole('button', { name: 'Retorno', exact: true }).click()
    await page.getByLabel('Almacén de retorno').selectOption(targetLocation.almacenDestinoId)
    await page.getByLabel('Ubicación de retorno').selectOption(targetLocation.ubicacionDestinoId)
    await page.getByRole('button', { name: 'Registrar retorno' }).click()
    await expect(page.getByText('Retorno registrado')).toBeVisible()
    const result = await get('/reparto/' + sheet.id)
    const returned = result.detalles.find((detail: { estado: string }) => detail.estado === 'RETORNADO')
    expect(result.estado).toBe('FINALIZADO')
    expect(returned.bulto.ubicacionActualId).toBe(targetLocation.ubicacionDestinoId)
    const next = await post('/reparto', { ...assignments, sedeId: dest.sedeId, ticketIds: [created.id], fecha: date })
    expect(next.detalles.map((item: { bultoId: string }) => item.bultoId)).toEqual([returned.bultoId])
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
