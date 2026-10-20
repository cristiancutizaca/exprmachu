import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { Usuario, RolUsuario } from '../database/entities/usuario.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertSedeAccess } from './sede-scope'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.usuarioRepo.findOne({ where: { username, activo: true } })
    if (!user) throw new UnauthorizedException('Usuario no encontrado o inactivo')
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new UnauthorizedException('Contraseña incorrecta')
    const payload = { sub: user.id, username: user.username, rol: user.rol, sede: user.sede, sedeId: user.sedeId }
    return {
      access_token: this.jwtService.sign(payload),
      user: { id:user.id, nombre:user.nombre, apellido:user.apellido, username:user.username, sede:user.sede, sedeId:user.sedeId, rol:user.rol, email:user.email },
    }
  }

  async getMe(userId: string) {
    const user = await this.usuarioRepo.findOneBy({ id: userId, activo: true })
    if (!user) throw new UnauthorizedException()
    const { password: _, ...safe } = user
    return safe
  }

  async changePassword(userId: string, passwordActual: string, passwordNueva: string) {
    if (!passwordNueva || passwordNueva.length < 8) throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres')
    const user = await this.usuarioRepo.findOneBy({ id: userId, activo: true })
    if (!user) throw new UnauthorizedException('Usuario no encontrado o inactivo')
    if (!await bcrypt.compare(passwordActual || '', user.password)) throw new BadRequestException({ statusCode: 400, code: 'CURRENT_PASSWORD_INVALID', message: 'La contraseña actual es incorrecta', details: {} })
    user.password = await bcrypt.hash(passwordNueva, 10)
    await this.usuarioRepo.save(user)
    await this.auditRepo.save(this.auditRepo.create({ usuarioId: user.id, accion: 'PASSWORD_CHANGE', entidad: 'Usuario', entidadId: user.id, metadata: { selfService: true } }))
    return { success: true, message: 'Contraseña actualizada correctamente' }
  }

  async resetPassword(actor: any, targetId: string, passwordNueva: string) {
    if (![RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE].includes(actor?.rol as RolUsuario)) throw new ForbiddenException({ statusCode: 403, code: 'PASSWORD_RESET_FORBIDDEN', message: 'El rol no puede restablecer contraseñas', details: {} })
    if (!passwordNueva || passwordNueva.length < 8) throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres')
    const target = await this.usuarioRepo.findOneBy({ id: targetId, activo: true })
    if (!target) throw new NotFoundException('Usuario objetivo no encontrado o inactivo')
    assertSedeAccess(actor, target.sedeId, 'restablecer la contraseña')
    target.password = await bcrypt.hash(passwordNueva, 10)
    await this.usuarioRepo.save(target)
    await this.auditRepo.save(this.auditRepo.create({ usuarioId: actor.sub, accion: 'PASSWORD_RESET', entidad: 'Usuario', entidadId: target.id, metadata: { targetUsername: target.username, targetRole: target.rol } }))
    return { success: true, message: 'Contraseña restablecida correctamente' }
  }
}
