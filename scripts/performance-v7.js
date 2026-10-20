#!/usr/bin/env node
'use strict'
const base = (process.env.API_BASE_URL || 'http://localhost:3002').replace(/\/$/, '')
const api = `${base}/api/v1`
const user = process.env.GRAEL_PERF_USER
const password = process.env.GRAEL_PERF_PASSWORD
const requests = Number(process.env.PERF_REQUESTS || 30)

async function login() {
  if (!user || !password) return null
  const response = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: user, password }) })
  const body = await response.json()
  return body.access_token
}
function percentile(values, p) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] }
async function measure(name, url, headers) {
  const durations = []; let errors = 0
  for (let i = 0; i < requests; i += 1) {
    const start = performance.now()
    try { const response = await fetch(url, { headers }); if (!response.ok) errors += 1; await response.arrayBuffer() } catch { errors += 1 }
    durations.push(Math.round(performance.now() - start))
  }
  console.log(JSON.stringify({ name, requests, errors, minMs: Math.min(...durations), maxMs: Math.max(...durations), p50Ms: percentile(durations, .5), p95Ms: percentile(durations, .95) }))
}
;(async () => {
  const token = await login()
  if (!token) { console.log(JSON.stringify({ status: 'SKIP', reason: 'Defina GRAEL_PERF_USER y GRAEL_PERF_PASSWORD' })); return }
  const headers = { Authorization: `Bearer ${token}` }
  await measure('health', `${base}/health`, {})
  await measure('dashboard', `${api}/reportes/dashboard`, headers)
  await measure('inventario', `${api}/inventario/bultos?page=1&limit=20`, headers)
  await measure('transbordo', `${api}/transbordo?page=1&limit=20`, headers)
})().catch(error => { console.error(JSON.stringify({ status: 'FAIL', error: error.message })); process.exit(1) })
