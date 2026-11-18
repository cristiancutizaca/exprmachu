import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { join } from 'node:path'
import { postgresConnectionOptions } from './connection-options'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        ...postgresConnectionOptions(),
        synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
        entities: [join(__dirname, 'entities', '**', '*.entity.{ts,js}')],
        migrations: [join(__dirname, 'migrations', '**', '*.{ts,js}')],
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
