import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthController } from './auth.controller'
import { AuthService }    from './auth.service'
import { JwtStrategy }    from './jwt.strategy'
import { Usuario }        from '../database/entities/usuario.entity'
import { AuditLog }       from '../database/entities/audit-log.entity'

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([Usuario, AuditLog]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const secret = cfg.get<string>('JWT_SECRET')
        if (!secret || secret === 'CAMBIAR_ESTO') throw new Error('JWT_SECRET es obligatorio para iniciar el backend')
        return { secret, signOptions: { expiresIn: cfg.get('JWT_EXPIRES_IN', '8h') } }
      },
    }),
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy],
  exports:     [AuthService, JwtModule],
})
export class AuthModule {}
