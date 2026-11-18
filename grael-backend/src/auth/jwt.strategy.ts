import { Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PassportStrategy } from '@nestjs/passport'
import { Repository } from 'typeorm'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Usuario } from '../database/entities/usuario.entity'
import { jwtSecret } from './jwt-secret'
import { isGlobalRole } from './sede-scope'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(),
      algorithms: ['HS256'],
    })
  }

  async validate(payload: { sub?: string }) {
    if (!payload.sub || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(payload.sub)) throw new UnauthorizedException()
    const user = await this.usuarios.findOne({
      where: { id: payload.sub, activo: true },
      select: { id: true, username: true, rol: true, sede: true, sedeId: true },
    })
    if (!user || !isGlobalRole(user) && !user.sedeId) throw new UnauthorizedException('Usuario inactivo o sin sede operativa')
    return { sub: user.id, username: user.username, rol: user.rol, sede: user.sede, sedeId: user.sedeId }
  }
}
