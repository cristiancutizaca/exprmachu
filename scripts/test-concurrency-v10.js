const base = (process.env.API_BASE_URL || 'http://127.0.0.1:3002/api/v1').replace(/\/$/, '')
const results = []
async function request(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const text = await response.text(); let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: response.status, data }
}
async function login(username, password) {
  const out = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  if (![200, 201].includes(out.status)) throw new Error(`login ${username}: ${out.status}`)
  return { token: out.data.access_token || out.data.token, user: out.data.user || out.data.usuario || out.data }
}
function auth(token) { return { Authorization: `Bearer ${token}` } }
function race(name, calls, acceptable) {
  return Promise.all(calls).then(responses => {
    const statuses = responses.map(item => item.status)
    const accepted = statuses.filter(status => acceptable.accepted.includes(status)).length
    const rejected = statuses.filter(status => acceptable.rejected.includes(status)).length
    const serverErrors = statuses.filter(status => status >= 500).length
    const uniqueNumbers = new Set(responses.map(item => item.data?.numero).filter(Boolean)).size
    const row = { name, total: statuses.length, statuses, accepted, rejected, serverErrors, uniqueNumbers }
    results.push(row)
    return row
  })
}
function skip(name, reason) { const row = { name, status: 'SKIP', reason }; results.push(row); return row }

const supervisor = await login('supervisor', process.env.GRAEL_SUPERVISOR_PASSWORD || 'super123')
const cashier = await login('maria.garcia', process.env.GRAEL_CASHIER_PASSWORD || 'caj123')
const repartidor = await login('repartidor.cusco', process.env.GRAEL_DELIVERY_PASSWORD || 'reparto123')
const ticketResponse = await request('/tickets?limit=100&page=1', { headers: auth(supervisor.token) })
const tickets = ticketResponse.data?.data || ticketResponse.data || []
const activeTicket = tickets.find(ticket => !ticket.anulado && (!supervisor.user?.sedeId || ticket.sedeRecepcionId === supervisor.user.sedeId) && Number(ticket.total || 0) > 0 && !ticket.pagado && (ticket.bultos || []).some(bulto => !['ANULADO', 'ENTREGADO'].includes(bulto.estado)))

if (cashier.user?.sedeId) {
  const openCalls = Array.from({ length: Number(process.env.CONCURRENCY_WIDTH || 10) }, () => request('/pagos/caja/abrir', { method: 'POST', headers: auth(cashier.token), body: JSON.stringify({ sedeId: cashier.user.sedeId, saldoInicial: 0, observacion: 'Fixture automatico V10 concurrency' }) }))
  const cashOpen = await race('cash_open_same_cashier', openCalls, { accepted: [201], rejected: [400, 409] })
  
  const session = await request('/pagos/caja/actual', { headers: auth(cashier.token) })
  const cajaId = session.data?.id
  if (cajaId) {
    const closeCalls = Array.from({ length: Number(process.env.CONCURRENCY_WIDTH || 10) }, () => request(`/pagos/caja/${cajaId}/cerrar`, { method: 'POST', headers: auth(cashier.token), body: JSON.stringify({ saldoDeclarado: 0, observacion: 'Cierre concurrente V10' }) }))
    await race('cash_close_same_session', closeCalls, { accepted: [201], rejected: [400, 409] })
  } else skip('cash_close_same_session', 'No quedó sesión abierta después de la carrera de apertura')
} else skip('cash_open_same_cashier', 'El login de cajero no devolvió sedeId')

if (activeTicket) {
  const paymentCalls = Array.from({ length: Number(process.env.CONCURRENCY_WIDTH || 10) }, () => request(`/tickets/${activeTicket.id}/pagar`, { method: 'PATCH', headers: auth(supervisor.token), body: JSON.stringify({ monto: Number(activeTicket.total), metodoPago: 'TRANSFERENCIA' }) }))
  await race('payment_same_ticket', paymentCalls, { accepted: [200, 201], rejected: [400, 409] })
  const greCalls = Array.from({ length: Number(process.env.CONCURRENCY_WIDTH || 10) }, () => request('/gre/emitir', { method: 'POST', headers: auth(supervisor.token), body: JSON.stringify({ ticketId: activeTicket.id, tipo: 'GRE', observacion: 'Fixture GRE concurrente V10' }) }))
  await race('gre_number_same_site', greCalls, { accepted: [201], rejected: [400, 409] })
  const cpeCalls = Array.from({ length: Number(process.env.CONCURRENCY_WIDTH || 10) }, () => request('/gre/emitir', { method: 'POST', headers: auth(supervisor.token), body: JSON.stringify({ ticketId: activeTicket.id, tipo: 'CPE', tipoComprobante: 'BOLETA', observacion: 'Fixture CPE concurrente V10' }) }))
  await race('cpe_number_same_site', cpeCalls, { accepted: [201], rejected: [400, 409] })
} else skip('payment_same_ticket', 'No hay ticket seed no pagado con total positivo y bulto activo')

const deliveryTicketsResponse = await request('/tickets?limit=100&page=1', { headers: auth(repartidor.token) })
const deliveryTickets = deliveryTicketsResponse.data?.data || deliveryTicketsResponse.data || []
const deliveryTicket = deliveryTickets.find(ticket => !ticket.anulado && (ticket.bultos || []).some(bulto => !['ANULADO', 'ENTREGADO'].includes(bulto.estado)))
const deliveryBulto = deliveryTicket?.bultos?.find(bulto => !['ANULADO', 'ENTREGADO'].includes(bulto.estado))
if (deliveryTicket && deliveryBulto) {
  const deliveryCalls = Array.from({ length: Number(process.env.CONCURRENCY_WIDTH || 10) }, () => request('/entregas', { method: 'POST', headers: auth(repartidor.token), body: JSON.stringify({ ticketId: deliveryTicket.id, bultoId: deliveryBulto.id, tipo: 'AGENCIA' }) }))
  await race('delivery_duplicate_same_bulto', deliveryCalls, { accepted: [201], rejected: [400, 409] })
} else skip('delivery_duplicate_same_bulto', 'No hay bulto activo visible para repartidor de Cusco')

const executed = results.filter(row => row.status !== 'SKIP')
const singleWinner = new Set(['cash_open_same_cashier', 'cash_close_same_session', 'payment_same_ticket', 'delivery_duplicate_same_bulto'])
const failures = executed.filter(row => row.serverErrors > 0 || (singleWinner.has(row.name) && row.accepted > 1) || (row.uniqueNumbers > 0 && row.uniqueNumbers < row.accepted))
console.log(JSON.stringify({ width: Number(process.env.CONCURRENCY_WIDTH || 10), executed: executed.length, skipped: results.length - executed.length, failures: failures.length, results }, null, 2))
if (failures.length) process.exit(1)
