import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'

const require = createRequire(new URL('../grael-backend/package.json', import.meta.url))
const { Client } = require('pg')
const { unzipSync, strFromU8, zipSync, strToU8 } = require('fflate')
const { DOMParser } = require('@xmldom/xmldom')
const { SignedXml } = require('xml-crypto')
const api = (process.env.API_BASE_URL || 'http://127.0.0.1:3002/api/v1').replace(/\/$/, '')
const ruc = process.env.SUNAT_GRE_TEST_RUC
const cert = await readFile(process.env.SUNAT_GRE_TEST_CERT_FILE, 'utf8')
const greBase = process.env.SUNAT_GRE_TEST_BASE_URL
if (process.env.SUNAT_GRE_ENV !== 'TEST' || process.env.SUNAT_CPE_ENV !== 'TEST'
  || !/^exprmachu_test_/.test(process.env.DB_NAME || '') || process.env.DB_HOST !== '127.0.0.1'
  || !greBase?.startsWith('http://127.0.0.1:') || greBase !== process.env.SUNAT_CPE_TEST_BASE_URL
  || !api.startsWith('http://127.0.0.1:')) {
  throw new Error('La prueba usa exclusivamente API, PostgreSQL y proveedor de pruebas locales')
}

const ticketsOfSend = new Map()
const seen = { token: 0, gre: 0, cpe: 0 }
const cbc = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
const cac = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'
const ds = 'http://www.w3.org/2000/09/xmldsig#'
const soap = 'http://schemas.xmlsoap.org/soap/envelope/'

function makeCdr(name, { code = 0, note = '', suffix } = {}) {
  const id = suffix || name.split('-').slice(2).join('-')
  const xml = `<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2" xmlns:cac="${cac}" xmlns:cbc="${cbc}">${note ? `<cbc:Note>${note}</cbc:Note>` : ''}<cac:DocumentResponse><cac:Response><cbc:ReferenceID>${id}</cbc:ReferenceID><cbc:ResponseCode>${code}</cbc:ResponseCode><cbc:Description>Constancia local de pruebas</cbc:Description></cac:Response><cac:DocumentReference><cbc:ID>${id}</cbc:ID></cac:DocumentReference></cac:DocumentResponse></ApplicationResponse>`
  return Buffer.from(zipSync({ [`R-${name}.xml`]: strToU8(xml) })).toString('base64')
}

function checkSignedZip(name, zip, hash) {
  if (hash) assert.equal(createHash('sha256').update(zip).digest('hex'), hash)
  const files = unzipSync(zip)
  assert.deepEqual(Object.keys(files), [`${name}.xml`])
  const text = strFromU8(files[`${name}.xml`])
  const root = new DOMParser().parseFromString(text, 'application/xml').documentElement
  const signature = root.getElementsByTagNameNS(ds, 'Signature').item(0)
  const checker = new SignedXml({ publicCert: cert })
  checker.loadSignature(signature)
  assert.equal(checker.checkSignature(text), true)
  return root
}
function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(value))
}
let fakeError
const server = createServer(async (req, res) => {
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const text = Buffer.concat(chunks).toString('utf8')
    if (req.url.includes('/oauth2/token/')) {
      seen.token++
      const fields = new URLSearchParams(text)
      assert.equal(req.headers['content-type'], 'application/x-www-form-urlencoded')
      assert.equal(fields.get('grant_type'), 'password')
      assert.equal(fields.get('username'), ruc + process.env.SUNAT_GRE_TEST_SOL_USER)
      return json(res, 200, { access_token: 'token-local-de-prueba', expires_in: 3600 })
    }
    if (req.url.includes('/gem/comprobantes')) {
      assert.equal(req.headers.authorization, 'Bearer token-local-de-prueba')
      if (req.method === 'GET') {
        const id = req.url.split('/').at(-1)
        const entry = ticketsOfSend.get(id)
        assert(entry)
        if (entry.mode === 'WAIT') {
          entry.mode = 'CDR'
          return json(res, 200, { codRespuesta: '98' })
        }
        return json(res, 200, {
          codRespuesta: '0', indCdrGenerado: '1',
          arcCdr: makeCdr(entry.name, { note: entry.name.includes('-31-') ? '4001 | Observación de prueba' : '', suffix: entry.mode === 'MISMATCH' ? 'V999-999' : undefined }),
        })
      }
      seen.gre++
      const { archivo } = JSON.parse(text)
      const name = archivo.nomArchivo.replace(/\.zip$/, '')
      assert(req.url.endsWith('/' + name))
      const root = checkSignedZip(name, Buffer.from(archivo.arcGreZip, 'base64'), archivo.hashZip)
      const type = name.split('-')[1]
      assert.equal(root.localName, 'DespatchAdvice')
      assert.equal(root.getElementsByTagNameNS(cbc, 'DespatchAdviceTypeCode').item(0).textContent, type)
      const id = randomUUID()
      ticketsOfSend.set(id, { name, mode: 'WAIT' })
      if (name.includes('V002')) return res.destroy()
      return json(res, 200, { numTicket: id })
    }
    if (req.method === 'POST' && req.url === '/') {
      seen.cpe++
      const xml = new DOMParser().parseFromString(text, 'application/xml').documentElement
      const get = name => xml.getElementsByTagNameNS('*', name).item(0)?.textContent
      assert.equal(get('Username'), process.env.SUNAT_CPE_TEST_RUC + process.env.SUNAT_CPE_TEST_SOL_USER)
      const name = get('fileName').replace(/\.zip$/, '')
      const root = checkSignedZip(name, Buffer.from(get('contentFile'), 'base64'))
      assert.equal(root.getElementsByTagNameNS(cbc, 'InvoiceTypeCode').item(0).textContent, name.split('-')[1])
      const response = `<s:Envelope xmlns:s="${soap}" xmlns:b="http://service.sunat.gob.pe"><s:Body><b:sendBillResponse><applicationResponse>${makeCdr(name)}</applicationResponse></b:sendBillResponse></s:Body></s:Envelope>`
      return res.writeHead(200, { 'content-type': 'text/xml' }).end(response)
    }
    json(res, 404, {})
  } catch (error) {
    fakeError = error
    json(res, 500, { error: 'Falló una aserción del proveedor local' })
  }
})
server.listen(Number(new URL(greBase).port), '127.0.0.1')
await once(server, 'listening')
const db = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME })
await db.connect()
try {
  async function apiCall(path, { method = 'GET', body, token, status = 200 } = {}) {
    const response = await fetch(api + path, {
      method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body && JSON.stringify(body),
    })
    const mime = response.headers.get('content-type')
    const payload = mime?.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer())
    if (fakeError) throw fakeError
    assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(payload?.message || payload?.code || '').slice(0, 1200)}`)
    return payload
  }
  async function login(username, password) {
    const result = await apiCall('/auth/login', { method: 'POST', body: { username, password }, status: 200 })
    return result.access_token
  }
  const token = await login('superadmin', process.env.GRAEL_TEST_SUPERADMIN_PASSWORD || 'superadmin123')
  const auditor = await login('auditor', process.env.GRAEL_TEST_AUDITOR_PASSWORD || 'auditor123')
  const req = (path, options) => apiCall(path, { token, ...options })
  const post = (path, body, status = 201) => req(path, { method: 'POST', body, status })
  const { rows: fixtures } = await db.query(`
    SELECT t.id, t.numero_ticket, t.sede_recepcion_id, t.remitente_id, t.destinatario_id
    FROM tickets t WHERE NOT t.anulado AND t.sede_recepcion_id IS NOT NULL
    ORDER BY t.id LIMIT 4
  `)
  assert.equal(fixtures.length, 4)
  const [carrier, sender, uncertain, invoice] = fixtures
  await db.query("UPDATE clientes SET ruc = $1, razon_social='EMISOR PRUEBAS XSD' WHERE id = ANY($2::uuid[])", [ruc, fixtures.flatMap(item => [item.remitente_id, item.destinatario_id])])
  for (const ticket of [invoice, sender]) {
    await db.query('UPDATE tickets SET sub_total=100, igv=18, total=118, pagado=true, monto_pagado=118 WHERE id=$1', [ticket.id])
    const payment = await db.query('UPDATE pagos SET monto=118 WHERE ticket_id=$1', [ticket.id])
    if (payment.rowCount === 0) {
      await db.query("INSERT INTO pagos (ticket_id, sede_id, metodo_pago, monto) VALUES ($1, $2, 'EFECTIVO', 118)", [ticket.id, ticket.sede_recepcion_id])
    }
    assert(payment.rowCount <= 1)
  }
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', dateStyle: 'short' }).format(new Date())
  const common = {
    fechaTraslado: day, pesoBruto: '10.500', unidadPeso: 'KGM', partida: { ubigeo: '080101', direccion: 'Partida de prueba' },
    llegada: { ubigeo: '211101', direccion: 'Llegada de prueba' },
    bienes: [{ descripcion: 'Cajas de prueba', cantidad: '2', unidad: 'BX' }],
    vehiculo: { placa: 'ABC123', tuc: '12345678900' },
    conductores: [{ dni: '12345678', licencia: 'Q12345678', nombres: 'PRUEBA', apellidos: 'LOCAL' }],
  }
  for (const [serie, tipoGuia, ticket] of [['V001', '31', carrier], ['V002', '31', uncertain], ['T001', '09', sender]]) {
    await post('/gre/fiscales/series', { sedeId: ticket.sede_recepcion_id, serie, tipoGuia, ultimoCorrelativo: 0 })
  }
  const create = (ticket, tipoGuia, serie, extra) => post('/gre/fiscales/borradores', {
    ...common, ticketId: ticket.id, tipoGuia, serie, solicitudId: randomUUID(), ...extra,
  })
  const gre = await create(carrier, '31', 'V001', { pagador: 'Tercero', terceroPagador: { tipoDocumento: '6', documento: ruc, razonSocial: 'PAGADOR DE PRUEBA' } })
  assert.equal(gre.estado, 'BORRADOR')
  await apiCall(`/gre/fiscales/${gre.id}/enviar`, { token: auditor, method: 'POST', status: 403 })
  await req(`/gre/fiscales/${gre.id}/borrador`, { method: 'PATCH', body: { ...gre.datos.traslado, observacion: 'Editar borrador local' } })
  assert.equal((await post(`/gre/fiscales/${gre.id}/validar`)).valido, true)
  const attempts = await Promise.all([post(`/gre/fiscales/${gre.id}/enviar`), post(`/gre/fiscales/${gre.id}/enviar`)])
  assert(attempts.some(item => item.estado === 'ENVIADO'))
  assert.equal(seen.gre, 1)
  assert.equal((await post(`/gre/fiscales/${gre.id}/consultar`)).estado, 'ENVIADO')
  assert.equal((await post(`/gre/fiscales/${gre.id}/consultar`)).estado, 'ACEPTADO_CON_OBSERVACIONES')
  assert.equal((await req(`/gre/fiscales/${gre.id}/archivos/pdf`)).subarray(0, 5).toString(), '%PDF-')
  assert.equal((await req(`/gre/fiscales/${gre.id}/archivos/cdr`)).subarray(0, 2).toString(), 'PK')
  console.log('GRE transportista: firma, XSD, envío concurrente, observaciones y descargas correctos')

  const greSender = await create(sender, '09', 'T001', { motivo: '04', modalidad: '02' })
  assert.equal((await post(`/gre/fiscales/${greSender.id}/validar`)).valido, true)
  const issuedSender = await post(`/gre/fiscales/${greSender.id}/enviar`)
  assert.equal(issuedSender.estado, 'ENVIADO')
  ticketsOfSend.get(issuedSender.ticketSunat).mode = 'MISMATCH'
  await post(`/gre/fiscales/${greSender.id}/consultar`, undefined, 502)
  assert.equal((await req(`/gre/fiscales/${greSender.id}`)).estado, 'ENVIADO')
  ticketsOfSend.get(issuedSender.ticketSunat).mode = 'CDR'
  assert.equal((await post(`/gre/fiscales/${greSender.id}/consultar`)).estado, 'ACEPTADO')
  console.log('GRE remitente: XSD y CDR de otro correlativo descartado')

  const damaged = await create(uncertain, '31', 'V002', { pagador: 'Remitente' })
  assert.equal((await post(`/gre/fiscales/${damaged.id}/enviar`)).estado, 'ENVIO_INCIERTO')
  assert.equal((await post(`/gre/fiscales/${damaged.id}/enviar`)).estado, 'ENVIO_INCIERTO')
  assert.equal(seen.gre, 3)
  const recovered = [...ticketsOfSend].find(([, item]) => item.name.includes('V002'))
  recovered[1].mode = 'CDR'
  assert.equal((await post(`/gre/fiscales/${damaged.id}/conciliar-ticket`, { ticket: recovered[0], motivo: 'Recuperación controlada en pruebas' })).estado, 'ACEPTADO_CON_OBSERVACIONES')
  console.log('GRE: corte de conexión conciliado con CDR, sin reenvío automático')

  for (const [serie, tipo, ticket] of [['F001','01',invoice], ['B001','03',sender]]) {
    await post('/comprobantes/fiscales/series', { sedeId: ticket.sede_recepcion_id, serie, tipo, ultimoCorrelativo: 0, codigoEstablecimiento: '0000' })
    const payload = {
      tipo, serie, ticketId: ticket.id, solicitudId: randomUUID(), sectorPublico: false, valorReferencialTipo: 'NO_CORRESPONDE', formaPago: 'Contado',
    }
    const issued = await post('/comprobantes/fiscales/emitir', payload)
    assert.equal(issued.estado, 'ACEPTADO')
    assert.equal(issued.ambiente, 'TEST')
    const retry = await post('/comprobantes/fiscales/emitir', payload)
    assert.equal(issued.comprobanteId, retry.comprobanteId)
    assert.equal((await req(`/comprobantes/${issued.comprobanteId}/pdf`)).subarray(0, 5).toString(), '%PDF-')
    assert.equal((await req(`/comprobantes/fiscales/${issued.comprobanteId}/archivos/cdr`)).subarray(0, 2).toString(), 'PK')
  }
  assert.equal(seen.cpe, 2)
  const report = await req(`/comprobantes?estado=ACEPTADO_TEST&limit=1&fechaDesde=${day}&fechaHasta=${day}`)
  assert.equal(report.data.length, 1)
  assert.equal(report.total, 2)
  assert.equal(report.resumen.totalCobrado, 236)
  assert.equal(report.resumen.totalFacturado, 0)
  const staleReport = await req('/comprobantes?fechaDesde=2000-01-01&fechaHasta=2000-01-01')
  assert.equal(staleReport.total, 0)
  console.log('CPE: factura y boleta SOAP, idempotencia, descarga PDF y total global por pagos pasaron')

  const estimate = await post('/comprobantes/detraccion/calcular', { importe: 400, valorReferencial: 500, gravado: true, sustentaCreditoOCosto: true, sectorPublico: false, domiciliado: true })
  assert.deepEqual(estimate, { base: 500, monto: 20, tasa: 4, aplica: true })
  console.log('Detracción: comparación con valor referencial verificada')
  const padronPath = join(await mkdtemp(join(tmpdir(), 'exprmachu-padron-')), 'padron.txt')
  await writeFile(padronPath, `RUC|NOMBRE O RAZÓN SOCIAL|ESTADO|CONDICIÓN|UBIGEO|\n${ruc}|RUC DE PRUEBA|ACTIVO|HABIDO|080101|\n`, 'latin1')
  await promisify(execFile)(process.execPath, [fileURLToPath(new URL('./importar-padron-ruc.mjs', import.meta.url)), padronPath, day], { timeout: 15000 })
  const taxpayer = await req(`/clientes/sunat/ruc/${ruc}`)
  assert.equal(taxpayer.registro.razonSocial, 'RUC DE PRUEBA')
  assert.equal(taxpayer.fechaPadron, day)
  console.log('RUC: importación atómica y consulta identificada por fecha en PostgreSQL')

  const { rows: [route] } = await db.query(`
    SELECT t.id, t.origen_id, t.destino_id, o.sede_id AS sede_origen_id, d.sede_id AS sede_destino_id
    FROM tickets t JOIN destinos o ON t.origen_id=o.id JOIN destinos d ON t.destino_id=d.id
    WHERE NOT t.anulado AND o.sede_id IS NOT NULL AND d.sede_id IS NOT NULL AND o.id <> d.id
      AND EXISTS (SELECT 1 FROM bultos b WHERE b.ticket_id=t.id AND b.estado IN ('RECEPCIONADO','EN_ALMACEN','PROGRAMADO'))
    ORDER BY t.id LIMIT 1
  `)
  assert(route)
  await db.query("UPDATE tickets SET sede_recepcion_id=$2, fecha_viaje=$3, estado='PENDIENTE' WHERE id=$1", [route.id, route.sede_origen_id, day])
  await db.query("UPDATE bultos SET sede_actual_id=$2, almacen_actual_id=NULL, ubicacion_actual_id=NULL, estado='EN_ALMACEN' WHERE ticket_id=$1 AND estado<>'ANULADO'", [route.id, route.sede_origen_id])
  const manifest = await post('/manifiesto', {
    origenId: route.origen_id, destinoId: route.destino_id, fechaViaje: day,
    sedeOrigenId: route.sede_origen_id, sedeDestinoId: route.sede_destino_id, seleccionAutomatica: true,
  })
  assert(manifest.tickets.some(ticket => ticket.id === route.id))
  assert.equal((await req(`/manifiesto/${manifest.id}/pdf`)).subarray(0, 5).toString(), '%PDF-')
  const { rows: [vehicle] } = await db.query('SELECT id FROM vehiculos LIMIT 1')
  const fleet = await req(`/vehiculos/${vehicle.id}/verificacion`)
  assert.equal(fleet.fuente, 'REGISTRO_INTERNO')
  assert.equal(fleet.documentos.length, 3)
  console.log('Manifiesto automático, PDF de carga y verificación interna de flota correctos')

} finally {
  await db.end()
  await new Promise(resolve => server.close(resolve))
}
