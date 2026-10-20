#!/usr/bin/env node
'use strict'

const base = (process.env.API_BASE_URL || 'http://localhost:3002/api/v1').replace(/\/$/, '')
const user = process.env.GRAEL_CONCURRENCY_USER
const password = process.env.GRAEL_CONCURRENCY_PASSWORD
const parallel = Number(process.env.CONCURRENCY_REQUESTS || 20)

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } })
  let body = null
  try { body = await response.json() } catch { body = await response.text() }
  return { status: response.status, body }
}

async function login() {
  if (!user || !password) return null
  const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username: user, password }) })
  if (result.status !== 200) throw new Error(`login status ${result.status}`)
  return result.body.access_token
}

async function race(label, operation, expectedRejects = []) {
  const started = Date.now()
  const results = await Promise.all(Array.from({ length: parallel }, () => operation()))
  const success = results.filter(item => item.status >= 200 && item.status < 300).length
  const rejected = results.filter(item => expectedRejects.includes(item.status) || (item.status >= 400 && item.status < 500)).length
  const unexpected = results.filter(item => item.status >= 500).length
  const duplicateIds = results.map(item => item.body?.id || item.body?.pago?.id || item.body?.registro?.id).filter(Boolean)
  const duplicates = duplicateIds.length - new Set(duplicateIds).size
  console.log(JSON.stringify({ label, requests: results.length, success, expectedRejects: rejected, unexpectedFailures: unexpected, duplicates, durationMs: Date.now() - started, statuses: results.reduce((acc, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc }, {}) }))
  return { success, rejected, unexpected, duplicates, results }
}

;(async () => {
  const token = await login()
  if (!token) {
    console.log(JSON.stringify({ label: 'login_concurrent', status: 'SKIP', reason: 'Defina GRAEL_CONCURRENCY_USER y GRAEL_CONCURRENCY_PASSWORD' }))
    process.exit(0)
  }

  await race('login_concurrent', () => request('/auth/login', { method: 'POST', body: JSON.stringify({ username: user, password }) }), [401, 429])

  const auth = { Authorization: `Bearer ${token}` }
  if (process.env.CONCURRENCY_TICKET_ID) {
    const amount = Number(process.env.CONCURRENCY_PAYMENT_AMOUNT || 80)
    await race('payment_race', () => request(`/tickets/${process.env.CONCURRENCY_TICKET_ID}/pagar`, { method: 'PATCH', headers: auth, body: JSON.stringify({ metodoPago: process.env.CONCURRENCY_PAYMENT_METHOD || 'TRANSFERENCIA', monto: amount }) }), [400, 409])
  } else console.log(JSON.stringify({ label: 'payment_race', status: 'SKIP', reason: 'Defina CONCURRENCY_TICKET_ID para no mutar un ticket por defecto' }))

  if (process.env.CONCURRENCY_SESSION_ID && process.env.CONCURRENCY_BULTO_CODE) {
    await race('double_unloading_scan', () => request(`/desembarque/sesiones/${process.env.CONCURRENCY_SESSION_ID}/bultos`, { method: 'POST', headers: auth, body: JSON.stringify({ codigo: process.env.CONCURRENCY_BULTO_CODE }) }), [400, 409])
  } else console.log(JSON.stringify({ label: 'double_unloading_scan', status: 'SKIP', reason: 'Defina CONCURRENCY_SESSION_ID y CONCURRENCY_BULTO_CODE' }))

  if (process.env.CONCURRENCY_MANIFEST_ID) {
    await race('manifest_detail_read', () => request(`/manifiesto/${process.env.CONCURRENCY_MANIFEST_ID}`, { headers: auth }), [])
  } else console.log(JSON.stringify({ label: 'manifest_detail_read', status: 'SKIP', reason: 'Defina CONCURRENCY_MANIFEST_ID' }))
})().catch(error => { console.error(JSON.stringify({ status: 'FAIL', error: error.message })); process.exit(1) })
