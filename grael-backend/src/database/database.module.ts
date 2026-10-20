import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { join } from 'path'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type:        'postgres',
        host:        cfg.get<string>('DB_HOST',     'localhost'),
        port:        cfg.get<number>('DB_PORT',      5432),
        username:    cfg.get<string>('DB_USER',     'grael_user'),
        password:    cfg.get<string>('DB_PASS',     'grael_pass_2026'),
        database:    cfg.get<string>('DB_NAME',     'grael_db'),
        // Las migraciones son la fuente de verdad; sincronización solo se activa explícitamente.
        synchronize: cfg.get<string>('DB_SYNC', 'false') === 'true',
        logging:     cfg.get<string>('DB_LOGGING', 'false') === 'true',
        entities:    [join(__dirname, '..', '**', '*.entity.{ts,js}')],
        migrations:  [join(__dirname, 'migrations', '**', '*.{ts,js}')],
        autoLoadEntities: true,
        ssl: cfg.get<string>('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
        extra: {
          max: 20,           // pool máximo de conexiones
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
