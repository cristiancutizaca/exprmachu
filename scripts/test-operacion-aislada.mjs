// Prueba de escritura en una base de fixtures local. La cuenta de pruebas necesita permisos de los módulos que intervienen.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../grael-backend/package.json', import.meta.url))
const { Client } = require('pg')
const base = new URL(process.env.API_BASE_URL || 'http://127.0.0.1:3002/api/v1')
const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, GRAEL_TEST_USER, GRAEL_TEST_PASSWORD, GRAEL_SUPERVISOR_PASSWORD } = process.env
assert.equal(base.hostname, '127.0.0.1')
assert.equal(DB_HOST, '127.0.0.1')
assert.match(DB_NAME || '', /^exprmachu_test_/)
assert(GRAEL_TEST_USER && GRAEL_TEST_PASSWORD && GRAEL_SUPERVISOR_PASSWORD, 'Configure las credenciales de superadmin y supervisor de pruebas')
const health = await fetch(new URL('/health', base)).then(r => r.json())
assert.equal(health.env, 'test')
assert.equal(health.db, 'ok')
const db = new Client({ host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASS, database: DB_NAME })
await db.connect()
let token
async function request(path, method = 'GET', body) {
  const response = await fetch(base.href + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) })
  const text = await response.text()
  assert(response.ok, `${method} ${path}: ${response.status} ${text.slice(0, 240)}`)
  return response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text
}
const get = path => request(path)
const post = (path, body) => request(path, 'POST', body)
const patch = (path, body) => request(path, 'PATCH', body)
try {
  const { access_token, user } = await post('/auth/login', { username: GRAEL_TEST_USER, password: GRAEL_TEST_PASSWORD })
  token = access_token
  assert.equal(user.rol, 'SUPERADMIN')
  const savedUser = await db.query('SELECT username FROM usuarios WHERE id=$1', [user.id])
  assert.equal(savedUser.rows[0]?.username, user.username, 'La API debe usar la misma base de fixtures')

  const destinations = await get('/destinos')
  const origin = destinations.find(row => row.codigo === 'LIM')
  const destination = destinations.find(row => row.codigo === 'CUS')
  assert(origin?.sedeId && destination?.sedeId)
  const { rows: customers } = await db.query('SELECT id FROM clientes ORDER BY id LIMIT 2')
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
  const type = 'CARGA GENERAL'
  const quote = await get('/mercaderia/calcular?' + new URLSearchParams({ tipo: type, peso: '1.5', origenId: origin.id, destinoId: destination.id, tipoEntrega: 'REPARTO' }))
  const reception = {
    fechaViaje: day, sedeRecepcionId: origin.sedeId, origenId: origin.id, destinoId: destination.id,
    remitenteId: customers[0].id, destinatarioId: customers[1].id, tipoEntrega: 'REPARTO', tipoPago: 'DESTINO',
    guiasRemision: [], mercaderias: [{ tipo: type, cantidad: 3, pesoTotal: 1.5, descripcion: 'Control de integración' }],
  }
  const ticket = await post('/tickets', reception)
  assert.equal(ticket.total, quote.total)
  const reread = await get('/tickets/' + ticket.id)
  assert.equal(typeof reread.total, 'number')
  assert.equal(reread.total, quote.total)
  const cents = Math.round(quote.total * 100)
  const pay = monto => patch(`/tickets/${ticket.id}/pagar`, { monto, metodoPago: 'TRANSFERENCIA' })
  const partial = await pay((cents - 1) / 100)
  assert.equal(partial.pagado, false)
  const pending = await get('/reportes/pendientes-cobro?sedeId=' + origin.sedeId)
  assert.equal(pending.find(t => t.numero_ticket === ticket.numeroTicket)?.saldo, 0.01)
  assert.equal((await pay(0.01)).pagado, true)
  const { rows: ledger } = await db.query('SELECT sum(monto) AS monto, count(*)::int AS n FROM pagos WHERE ticket_id=$1', [ticket.id])
  assert.equal(ledger[0].n, 2)
  assert.equal(Number(ledger[0].monto), quote.total)
  await assert.rejects(patch('/tickets/' + ticket.id + '/anular', { motivo: 'Control de anulaciones' }), /400 .*TICKET_HAS_PAYMENTS/)
  const searched = await get('/tickets?' + new URLSearchParams({ numeroTicket: ticket.numeroTicket, origenId: origin.id, pagado: 'true' }))
  assert.equal(searched.data[0]?.id, ticket.id)
  assert.match(await get(`/tickets/${ticket.id}/imprimir`), /Control de integración/)
  console.log('OK cotización, recepción, abonos parciales, saldo de un céntimo, consulta, impresión y libro de pagos')

  async function location(sedeId) {
    const [warehouse] = await get('/almacenes?sedeId=' + sedeId)
    const [position] = await get('/almacenes/' + warehouse.id + '/ubicaciones')
    return { almacenDestinoId: warehouse.id, ubicacionDestinoId: position.id }
  }
  const [bulto] = reread.bultos
  await post('/inventario/movimientos', { ...await location(origin.sedeId), bultoId: bulto.id, tipo: 'INGRESO', motivo: 'Ingreso de la prueba' })
  const inventory = await get('/inventario/bultos?ticketId=' + ticket.id)
  assert.equal(inventory.data[0]?.id, bulto.id)
  const fleet = await get('/vehiculos?estado=ACTIVO')
  const vehicle = fleet.find(v => !v.sedeId || v.sedeId === origin.sedeId)
  const driver = (await get('/conductores?estado=ACTIVO')).find(d => !d.sedeId || d.sedeId === origin.sedeId)
  const manifest = await post('/manifiesto', { origenId: origin.id, destinoId: destination.id, sedeOrigenId: origin.sedeId, sedeDestinoId: destination.sedeId,
    fechaViaje: day, vehiculoId: vehicle.id, conductorId: driver.id })
  const mid = '/manifiesto/' + manifest.id
  await post(mid + '/tickets', { ticketIds: [ticket.id] })
  await post(mid + '/carga/bulto', { codigo: bulto.codigo })
  await post(mid + '/despachar')
  await post(mid + '/llegada')
  const session = await post('/desembarque/sesiones', { manifiestoId: manifest.id, ...await location(destination.sedeId) })
  await post(`/desembarque/sesiones/${session.id}/bultos`, { codigo: bulto.codigo, estado: 'RECIBIDO' })
  const closing = await post(`/desembarque/sesiones/${session.id}/cerrar`, {})
  assert.equal(closing.pending, 0)
  assert.equal(closing.received, 1)
  await patch(mid + '/estado', { estado: 'CERRADO' })
  console.log('OK almacén de origen, manifiesto, carga, despacho, llegada y desembarque físico')

  const { rows: [courier] } = await db.query("SELECT id FROM usuarios WHERE rol='REPARTIDOR' AND activo AND sede_id=$1 ORDER BY id LIMIT 1", [destination.sedeId])
  const deliveryVehicle = fleet.find(v => !v.sedeId || v.sedeId === destination.sedeId)
  const sheet = await post('/reparto', { vehiculoId: deliveryVehicle.id, repartidorId: courier.id, ticketIds: [ticket.id], sedeId: destination.sedeId, fecha: day, zona: 'Pruebas' })
  await post(`/reparto/${sheet.id}/iniciar`)
  const detail = await get('/reparto/' + sheet.id)
  assert.equal(detail.detalles.length, 1)
  await patch('/reparto/detalle/' + detail.detalles[0].id + '/intento', { estado: 'ENTREGADO', nombreReceptor: 'Receptor de prueba', documentoReceptor: '12345678', observacion: 'POD de prueba' })
  const pod = await get('/entregas?bultoId=' + bulto.id)
  assert.equal(pod.filter(item => item.estado === 'ENTREGADA' && item.documentoReceptor === '12345678').length, 1)
  await post(`/reparto/${sheet.id}/finalizar`)
  const tracked = await get('/tracking/public/' + ticket.numeroTicket)
  assert.equal(tracked.estado, 'ENTREGADO')
  assert(tracked.eventos.length > 1 && tracked.eventos.every(event => event.id))
  console.log('OK reparto, POD, cierre y tracking público con eventos persistidos')

  const expense = await post('/egresos', { categoria: 'SERVICIO', concepto: 'Verificación contable aislada', monto: 2.35, afectaCaja: false, sedeId: origin.sedeId })
  const approvePath = '/egresos/' + expense.id + '/aprobar'
  await assert.rejects(patch(approvePath, {}), /403 .*EXPENSE_SELF_APPROVAL/)
  const supervisor = await post('/auth/login', { username: 'supervisor', password: GRAEL_SUPERVISOR_PASSWORD })
  assert.notEqual(supervisor.user.id, user.id)
  token = supervisor.access_token
  assert.equal((await patch(approvePath, {})).estado, 'APROBADO')
  const expenses = await get('/egresos?sedeId=' + origin.sedeId)
  assert((expenses.data ?? expenses).some(row => row.id === expense.id && row.monto === 2.35))
  console.log('OK egreso solicitado, aprobado y consultado con importe decimal')

  const suffix = randomBytes(4).toString('hex')
  const schedule = await post('/programaciones', {
    codigo: 'QA-' + suffix, origenId: origin.id, destinoId: destination.id,
    vehiculoId: vehicle.id, conductorId: driver.id, horaSalida: '19:15',
  })
  const scheduled = await get('/programaciones/' + schedule.id)
  assert.equal(scheduled.origen.id, origin.id)
  assert.equal(scheduled.vehiculoId, vehicle.id)
  const moved = await post('/tickets', { ...reception, tipoEntrega: 'AGENCIA', programacionId: schedule.id })
  const canceled = await post('/tickets', { ...reception, tipoEntrega: 'AGENCIA', programacionId: schedule.id })
  assert.equal((await patch('/tickets/' + canceled.id + '/anular', { motivo: 'Anulación de verificación' })).anulado, true)
  const transfer = await post('/transbordo', {
    origenId: origin.id, destinoId: destination.id, sedeId: origin.sedeId, motivo: 'Control local',
    vehiculoNuevoId: vehicle.id, conductorNuevoId: driver.id,
  })
  const tr = '/transbordo/' + transfer.id
  await post(tr + '/tickets', { ticketId: moved.id })
  for (const estado of ['EN_TRANSITO', 'LLEGADO', 'CERRADO']) assert.equal((await patch(tr + '/estado', { estado })).estado, estado)
  assert((await get(tr + '/manifiesto')).includes(moved.numeroTicket))
  const movedTicket = await get('/tickets/' + moved.id)
  const incident = await post('/incidencias', { ticketId: moved.id, bultoId: movedTicket.bultos[0].id, tipo: 'DOCUMENTAL', descripcion: 'Verificación de incidencia' })
  const resolution = await patch('/incidencias/' + incident.id + '/resolver', { estado: 'RESUELTA', disposicion: 'SIN_CAMBIO_FISICO', resolucion: 'Comprobación local' })
  assert.equal(resolution.disposicion, 'SIN_CAMBIO_FISICO')
  assert((await get('/incidencias?ticketId=' + moved.id)).some(item => item.id === incident.id && item.estado === 'RESUELTA'))
  console.log('OK programación con flota, transbordo, manifiesto CSV e incidencia resuelta y consultada')

  const setting = 'auditoria.comprobacion'
  await post('/configuracion/bulk', { updates: [{ clave: setting, valor: suffix }] })
  assert.equal((await get('/configuracion/all'))[setting], suffix)
  assert((await get('/sedes')).some(sede => sede.id === origin.sedeId))
  const username = 'audit.' + suffix
  const password = randomBytes(24).toString('base64url')
  const operator = await post('/usuarios', { username, password, nombre: 'Operación', apellido: 'Pruebas', sedeId: origin.sedeId, rol: 'OPERADOR' })
  const listed = await get('/usuarios/' + operator.id)
  assert.equal(listed.sedeId, origin.sedeId)
  assert(!Object.hasOwn(listed, 'password'))
  const audit = await get('/auditoria?entidadId=' + expense.id)
  assert((audit.data ?? audit).length > 0)
  token = (await post('/auth/login', { username, password })).access_token
  assert((await get('/reparto/recursos?sedeId=' + origin.sedeId)).vehiculos.some(row => row.id === vehicle.id))
  await assert.rejects(get('/reparto/recursos?sedeId=' + destination.sedeId), /403 .*SEDE_FORBIDDEN/)
  await assert.rejects(get('/usuarios'), /403/)
  console.log('OK configuración, auditoría, usuarios, roles y bloqueo de otra sede')
} finally { await db.end() }
