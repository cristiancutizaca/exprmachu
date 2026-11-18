import { createReadStream } from 'node:fs'
import { createRequire } from 'node:module'
import { createInterface } from 'node:readline'
const require = createRequire(new URL('../grael-backend/package.json', import.meta.url))
const { Client } = require('pg')

const [archivo, fecha] = process.argv.slice(2)
if (!archivo || !/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) {
  console.error('Uso: node scripts/importar-padron-ruc.mjs <padron_reducido_ruc.txt> <AAAA-MM-DD>')
  process.exit(1)
}
for (const key of ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME']) {
  if (!process.env[key]) {
    console.error(`Configure ${key}`)
    process.exit(1)
  }
}
const { readFile } = await import('node:fs/promises')
const tls = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true'
const ca = tls && process.env.DB_CA_FILE ? await readFile(process.env.DB_CA_FILE, 'utf8') : undefined
const client = new Client({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  ssl: tls ? { rejectUnauthorized: true, ca } : false,
})
let source
await client.connect()
try {
  await client.query('BEGIN')
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended('padron_reducido_sunat', 0))")
  const [row] = (await client.query('SELECT MAX(fecha_padron)::text AS fecha FROM padron_ruc')).rows
  if (row?.fecha && fecha <= row.fecha) throw new Error('La fecha del padrón debe ser posterior a la última importación')
  await client.query('CREATE TEMP TABLE padron_importacion (LIKE padron_ruc INCLUDING INDEXES) ON COMMIT DROP')
  let batch = []
  let count = 0
  const flush = async () => {
    if (!batch.length) return
    await client.query(`
      INSERT INTO padron_importacion (ruc, razon_social, estado, condicion, fecha_padron)
      SELECT * FROM UNNEST($1::varchar[], $2::text[], $3::varchar[], $4::varchar[], $5::date[])
    `, [0,1,2,3].map(index => batch.map(item => item[index])).concat([batch.map(() => fecha)]))
    count += batch.length
    batch = []
  }
  let lineNumber = 0
  source = createInterface({ input: createReadStream(archivo, { encoding: 'latin1' }), crlfDelay: Infinity })
  for await (const line of source) {
    lineNumber++
    if (!line.trim()) continue
    const fields = line.split('|').slice(0, 4).map(value => value.trim())
    if (lineNumber === 1 && fields[0].replace(/^ï»¿/, '').toUpperCase() === 'RUC') continue
    if (!/^\d{11}$/.test(fields[0]) || fields.length !== 4 || fields.some(value => !value) || fields[2].length > 30 || fields[3].length > 30) {
      throw new Error(`Formato inesperado en la línea ${lineNumber}`)
    }
    batch.push(fields)
    if (batch.length >= 5000) await flush()
  }
  await flush()
  if (!count) throw new Error('El padrón está vacío')
  await client.query(`
    INSERT INTO padron_ruc SELECT * FROM padron_importacion
    ON CONFLICT (ruc) DO UPDATE SET razon_social = EXCLUDED.razon_social,
      estado = EXCLUDED.estado, condicion = EXCLUDED.condicion, fecha_padron = EXCLUDED.fecha_padron
  `)
  await client.query('COMMIT')
  console.log(`Padrón SUNAT ${fecha} disponible. Registros importados: ${count}.`)
} catch (error) {
  await client.query('ROLLBACK')
  console.error('Importación cancelada:', error.code || error.message)
  process.exitCode = 1
} finally {
  source?.close()
  await client.end()
}
