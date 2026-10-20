import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from './roles.decorator'
import { RolUsuario } from '../database/entities/usuario.entity'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [context.getHandler(), context.getClass()])
    if (!roles?.length) return true
    const request = context.switchToHttp().getRequest()
    const user = request.user
    if (roles.includes(user?.rol)) return true
    throw new ForbiddenException({ statusCode: 403, code: 'ROLE_FORBIDDEN', message: 'El usuario no tiene permisos para esta operación', details: { required: roles } })
  }
}
