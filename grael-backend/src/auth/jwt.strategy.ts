// ─── jwt.strategy.ts ──────────────────────────────────────────────────────────
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET
    if (!secret || secret === 'CAMBIAR_ESTO') throw new Error('JWT_SECRET es obligatorio para validar tokens')
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    })
  }

  async validate(payload: any) {
    return { sub: payload.sub, username: payload.username, rol: payload.rol, sede: payload.sede, sedeId: payload.sedeId }
  }
}
