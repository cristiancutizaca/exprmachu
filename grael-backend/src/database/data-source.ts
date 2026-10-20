import 'reflect-metadata'
import { DataSource } from 'typeorm'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config()

export const AppDataSource = new DataSource({
  type:     'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER     || 'grael_user',
  password: process.env.DB_PASS     || 'grael_pass_2026',
  database: process.env.DB_NAME     || 'grael_db',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities:   [join(__dirname, 'entities', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '**', '*.{ts,js}')],
  subscribers: [],
})
