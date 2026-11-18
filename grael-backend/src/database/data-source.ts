import 'reflect-metadata'
import { DataSource } from 'typeorm'
import * as dotenv from 'dotenv'
import { join } from 'node:path'
import { postgresConnectionOptions } from './connection-options'

dotenv.config()

export const AppDataSource = new DataSource({
  ...postgresConnectionOptions(),
  entities: [join(__dirname, 'entities', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '**', '*.{ts,js}')],
})
