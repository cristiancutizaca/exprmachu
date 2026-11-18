import { readFileSync } from 'node:fs'
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'

export function postgresConnectionOptions(env: NodeJS.ProcessEnv = process.env): PostgresConnectionOptions {
  const production = env.NODE_ENV === 'production'
  const port = Number(env.DB_PORT || '5432')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DB_PORT inválido')
  if (production) {
    for (const key of ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME']) {
      if (!env[key]?.trim()) throw new Error(`${key} es obligatorio en producción`)
    }
    if (env.DB_PASS === 'grael_pass_2026') throw new Error('DB_PASS de ejemplo no es válido en producción')
    if (env.DB_SSL === 'false' || env.DB_SYNC === 'true') {
      throw new Error('PostgreSQL requiere TLS verificado y migraciones en producción')
    }
  }

  const tls = production || env.DB_SSL === 'true'
  const ca = tls && env.DB_CA_FILE ? readFileSync(env.DB_CA_FILE, 'utf8') : undefined
  return {
    type: 'postgres',
    host: env.DB_HOST || 'localhost',
    port,
    username: env.DB_USER || 'grael_user',
    password: env.DB_PASS || 'grael_pass_2026',
    database: env.DB_NAME || 'grael_db',
    synchronize: false,
    logging: !production && env.DB_LOGGING === 'true',
    ssl: tls ? { rejectUnauthorized: true, ca } : false,
    extra: { max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 },
  }
}
