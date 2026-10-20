const base = (process.env.API_BASE_URL || 'http://127.0.0.1:3002/api/v1').replace(/\/$/, '')
async function request(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const text = await response.text(); let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: response.status, data }
}
async function login(username, password) {
  const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  if (![200, 201].includes(result.status)) throw new Error(`login ${username}: ${result.status}`)
  return { token: result.data.access_token || result.data.token, user: result.data.user || result.data.usuario || result.data }
}
const checks = []
const supervisor = await login('supervisor', process.env.GRAEL_SUPERVISOR_PASSWORD || 'super123')
const auditor = await login('auditor', process.env.GRAEL_AUDITOR_PASSWORD || 'auditor123')
const repartidor = await login('repartidor.cusco', process.env.GRAEL_DELIVERY_PASSWORD || 'reparto123')
const cashier = await login('maria.garcia', process.env.GRAEL_CASHIER_PASSWORD || 'caj123')
const auth = token => ({ Authorization: `Bearer ${token}` })
const cashOpen = await request('/pagos/caja/abrir', { method: 'POST', headers: auth(cashier.token), body: JSON.stringify({ sedeId: cashier.user.sedeId, saldoInicial: 100, observacion: 'Apertura smoke V10' }) })
const cashId = cashOpen.data?.id
const cashMovement = cashId ? await request(`/pagos/caja/${cashId}/movimientos`, { method: 'POST', headers: auth(cashier.token), body: JSON.stringify({ tipoMovimiento: 'INGRESO', monto: 20, metodoPago: 'EFECTIVO', concepto: 'Cobro efectivo smoke V10' }) }) : { status: 0, data: null }
const digitalMovement = cashId ? await request(`/pagos/caja/${cashId}/movimientos`, { method: 'POST', headers: auth(cashier.token), body: JSON.stringify({ tipoMovimiento: 'INGRESO', monto: 50, metodoPago: 'YAPE', concepto: 'Cobro digital smoke V10' }) }) : { status: 0, data: null }
const cashActual = cashId ? await request('/pagos/caja/actual', { headers: auth(cashier.token) }) : { status: 0, data: null }
const cashClose = cashId ? await request(`/pagos/caja/${cashId}/cerrar`, { method: 'POST', headers: auth(cashier.token), body: JSON.stringify({ saldoDeclarado: 120, observacion: 'Cierre smoke V10' }) }) : { status: 0, data: null }
checks.push({ name: 'cash_ledger_physical_digital', openStatus: cashOpen.status, cashMovementStatus: cashMovement.status, digitalMovementStatus: digitalMovement.status, actualStatus: cashActual.status, expectedCash: cashActual.data?.resumen?.esperadoEfectivo, digital: cashActual.data?.resumen?.totalDigital, closeStatus: cashClose.status, closeState: cashClose.data?.caja?.estado })
const ticketsResponse = await request('/tickets?limit=100&page=1', { headers: auth(supervisor.token) })
if (ticketsResponse.status !== 200) throw new Error(`tickets: ${ticketsResponse.status}`)
const tickets = ticketsResponse.data?.data || ticketsResponse.data || []
const active = t => !t.anulado && (t.bultos || []).some(b => !['ANULADO', 'ENTREGADO'].includes(b.estado))
const candidate = tickets.find(active)
if (!candidate) throw new Error('No hay ticket sembrado con bultos activos')
const bulto = candidate.bultos.find(b => !['ANULADO', 'ENTREGADO'].includes(b.estado))
const incident = await request('/incidencias', { method: 'POST', headers: auth(supervisor.token), body: JSON.stringify({ ticketId: candidate.id, bultoId: bulto.id, tipo: 'DANADO', descripcion: 'Fixture V10 disposición física' }) })
checks.push({ name: 'incident_custody', status: incident.status, sedeId: incident.data?.sedeId, expectedSedeId: bulto.sedeActualId })
const auditorAttempt = await request(`/incidencias/${incident.data?.id}/resolver`, { method: 'PATCH', headers: auth(auditor.token), body: JSON.stringify({ estado: 'RESUELTA', disposicion: 'SIN_CAMBIO_FISICO', resolucion: 'No autorizado' }) })
checks.push({ name: 'auditor_read_only', status: auditorAttempt.status, code: auditorAttempt.data?.code || auditorAttempt.data?.response?.code })
const resolved = await request(`/incidencias/${incident.data?.id}/resolver`, { method: 'PATCH', headers: auth(supervisor.token), body: JSON.stringify({ estado: 'RESUELTA', disposicion: 'REINGRESADO_ALMACEN', resolucion: 'Reingreso al almacén de custodia' }) })
checks.push({ name: 'supervisor_resolves', status: resolved.status, disposition: resolved.data?.disposicion })
const deliveryTicket = tickets.find(t => t.id !== candidate.id && active(t)) || candidate
const deliveryBulto = deliveryTicket.bultos.find(b => !['ANULADO', 'ENTREGADO'].includes(b.estado))
const delivery = await request('/entregas', { method: 'POST', headers: auth(repartidor.token), body: JSON.stringify({ ticketId: deliveryTicket.id, bultoId: deliveryBulto.id, tipo: 'AGENCIA' }) })
checks.push({ name: 'create_delivery_at_custody', status: delivery.status, sedeId: delivery.data?.sedeId })
let confirmed = { status: 0, data: null }
if (delivery.data?.id) confirmed = await request(`/entregas/${delivery.data.id}/entregar`, { method: 'PATCH', headers: auth(repartidor.token), body: JSON.stringify({ nombreReceptor: 'RECEPTOR V10', documentoReceptor: '12345678', observacion: 'POD V10 validado' }) })
checks.push({ name: 'confirm_delivery', status: confirmed.status, estado: confirmed.data?.estado })
const duplicateDelivery = await request('/entregas', { method: 'POST', headers: auth(repartidor.token), body: JSON.stringify({ ticketId: deliveryTicket.id, bultoId: deliveryBulto.id, tipo: 'AGENCIA' }) })
checks.push({ name: 'duplicate_delivery_blocked', status: duplicateDelivery.status, code: duplicateDelivery.data?.code || duplicateDelivery.data?.response?.code })
const gre = await request('/gre/emitir', { method: 'POST', headers: auth(supervisor.token), body: JSON.stringify({ ticketId: candidate.id, tipo: 'GRE', observacion: 'Fixture GRE V10 MOCK' }) })
checks.push({ name: 'gre_mock', status: gre.status, estado: gre.data?.estado, hashLength: gre.data?.hashXml?.length, sedeId: gre.data?.sedeId })
const cpe = await request('/gre/emitir', { method: 'POST', headers: auth(supervisor.token), body: JSON.stringify({ ticketId: candidate.id, tipo: 'CPE', tipoComprobante: 'BOLETA', observacion: 'Fixture CPE V10 MOCK' }) })
checks.push({ name: 'cpe_mock', status: cpe.status, estado: cpe.data?.estado, sameNumberContract: Boolean(cpe.data?.numero && cpe.data?.comprobanteId) })
console.log(JSON.stringify({ ticketId: candidate.id, bultoId: bulto.id, deliveryTicketId: deliveryTicket.id, checks }, null, 2))
const required = checks.every(check => ({
  incident_custody: check.status === 201 && check.sedeId === check.expectedSedeId,
  auditor_read_only: check.status === 403,
  supervisor_resolves: check.status >= 200 && check.status < 300 && check.disposition === 'REINGRESADO_ALMACEN',
  create_delivery_at_custody: [200, 201].includes(check.status),
  confirm_delivery: [200, 201].includes(check.status) && check.estado === 'ENTREGADA',
  duplicate_delivery_blocked: check.status === 409,
  gre_mock: check.status === 201 && check.estado === 'ACEPTADO_MOCK' && check.hashLength === 64,
  cpe_mock: check.status === 201 && check.estado === 'ACEPTADO_MOCK' && check.sameNumberContract,
  cash_ledger_physical_digital: check.openStatus === 201 && check.cashMovementStatus === 201 && check.digitalMovementStatus === 201 && check.actualStatus === 200 && check.expectedCash === 120 && check.digital === 50 && check.closeStatus === 201 && check.closeState === 'CERRADA',
}[check.name]))
if (!required) process.exit(1)
