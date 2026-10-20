const base = process.env.GRAEL_API || 'http://127.0.0.1:3002/api/v1'
const users = [
  ['jesus.cutisaca', process.env.GRAEL_ADMIN_PASSWORD || 'admin123'],
  ['leydy.diana', process.env.GRAEL_OPERATOR_PASSWORD || 'op123'],
  ['maria.garcia', process.env.GRAEL_CASHIER_PASSWORD || 'caj123'],
  ['supervisor', process.env.GRAEL_SUPERVISOR_PASSWORD || 'super123'],
]
async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const text = await response.text()
  let body; try { body = JSON.parse(text) } catch { body = text }
  return { status: response.status, body }
}
for (const [username, password] of users) {
  const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  const token = login.body?.access_token || login.body?.token || login.body?.accessToken
  if (!token) { console.log(JSON.stringify({ username, loginStatus: login.status, login: login.body })); continue }
  const me = await request('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
  console.log(JSON.stringify({ username, loginStatus: login.status, me: me.body }))
}
const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'supervisor', password: process.env.GRAEL_SUPERVISOR_PASSWORD || 'super123' }) })
const token = login.body?.access_token || login.body?.token || login.body?.accessToken
const headers = { Authorization: `Bearer ${token}` }
const tickets = await request('/tickets?limit=50&page=1', { headers })
const bultos = await request('/bultos?limit=100&page=1', { headers })
console.log(JSON.stringify({ ticketsStatus: tickets.status, tickets: tickets.body, bultosStatus: bultos.status, bultos: bultos.body }))
