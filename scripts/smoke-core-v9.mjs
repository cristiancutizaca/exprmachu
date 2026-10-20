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
  const token = result.data.access_token || result.data.token
  return { token, user: result.data.user || result.data.usuario || result.data }
}
const checks = []
const admin = await login('jesus.cutisaca', 'admin123')
const supervisor = await login('supervisor', 'super123')
const auditor = await login('auditor', 'auditor123')
const repartidor = await login('repartidor.cusco', 'reparto123')
const auth = token => ({ Authorization: `Bearer ${token}` })
const ticketsResponse = await request('/tickets?limit=100', { headers: auth(supervisor.token) })
const tickets = ticketsResponse.data?.data || ticketsResponse.data || []
const candidate = tickets.find(t => !t.anulado && t.estado !== 'ENTREGADO' && (t.bultos || []).some(b => !['ANULADO', 'ENTREGADO'].includes(b.estado)))
if (!candidate) throw new Error('No hay ticket sembrado con bultos activos')
const bulto = (candidate.bultos || []).find(b => !['ANULADO', 'ENTREGADO'].includes(b.estado))
const incident = await request('/incidencias', { method: 'POST', headers: auth(admin.token), body: JSON.stringify({ ticketId: candidate.id, bultoId: bulto.id, tipo: 'DANADO', descripcion: 'Fixture V9 incidencia de custodia' }) })
checks.push({ name: 'incident_custody', status: incident.status, sedeId: incident.data?.sedeId, expectedSedeId: bulto.sedeActualId })
const auditorAttempt = await request(`/incidencias/${incident.data?.id}/resolver`, { method: 'PATCH', headers: auth(auditor.token), body: JSON.stringify({ estado: 'RESUELTA', resolucion: 'No autorizado' }) })
checks.push({ name: 'auditor_read_only', status: auditorAttempt.status, code: auditorAttempt.data?.code })
const resolved = await request(`/incidencias/${incident.data?.id}/resolver`, { method: 'PATCH', headers: auth(supervisor.token), body: JSON.stringify({ estado: 'RESUELTA', resolucion: 'Revisado por supervisor' }) })
checks.push({ name: 'supervisor_resolves', status: resolved.status })
const deliveryTicket = tickets.find(t => t.id !== candidate.id && !t.anulado && t.estado !== 'ENTREGADO' && (t.bultos || []).filter(b => !['ANULADO', 'ENTREGADO'].includes(b.estado)).length > 0) || candidate
const delivery = await request('/entregas', { method: 'POST', headers: auth(repartidor.token), body: JSON.stringify({ ticketId: deliveryTicket.id, tipo: 'AGENCIA' }) })
checks.push({ name: 'create_delivery_at_custody', status: delivery.status, sedeId: delivery.data?.sedeId })
let confirmed = { status: 0, data: null }
if (delivery.data?.id) confirmed = await request(`/entregas/${delivery.data.id}/entregar`, { method: 'PATCH', headers: auth(repartidor.token), body: JSON.stringify({ nombreReceptor: 'RECEPTOR V9', documentoReceptor: '12345678', observacion: 'Fixture entrega real' }) })
checks.push({ name: 'confirm_delivery', status: confirmed.status, estado: confirmed.data?.estado })
const gre = await request('/gre/emitir', { method: 'POST', headers: auth(admin.token), body: JSON.stringify({ ticketId: candidate.id, tipo: 'GRE', observacion: 'Fixture GRE V9' }) })
checks.push({ name: 'gre_mock', status: gre.status, estado: gre.data?.estado, hashLength: gre.data?.hashXml?.length, sedeId: gre.data?.documento?.sedeId })
console.log(JSON.stringify({ ticketId: candidate.id, bultoId: bulto.id, deliveryTicketId: deliveryTicket.id, checks }, null, 2))
const required = checks.every(check => ({ incident_custody: check.status === 201 && check.sedeId === check.expectedSedeId, auditor_read_only: check.status === 403, supervisor_resolves: check.status >= 200 && check.status < 300, create_delivery_at_custody: [200, 201].includes(check.status), confirm_delivery: [200, 201].includes(check.status), gre_mock: check.status === 201 && check.estado === 'ACEPTADO_MOCK' && check.hashLength === 64 }[check.name]))
if (!required) process.exit(1)
