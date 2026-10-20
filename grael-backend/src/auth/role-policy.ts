import { ForbiddenException } from '@nestjs/common'
import { RolUsuario } from '../database/entities/usuario.entity'

const GLOBAL_ROLES = new Set<RolUsuario>([RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.AUDITOR])
const SITE_ROLES = new Set<RolUsuario>([RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.ALMACEN, RolUsuario.CAJERO, RolUsuario.REPARTIDOR])

export function canAssignRole(actorRole: RolUsuario | string | undefined, targetRole: RolUsuario | string | undefined): boolean {
  if (!actorRole || !targetRole) return false
  if (actorRole === RolUsuario.SUPERADMIN) return true
  if (actorRole === RolUsuario.SUPERVISOR) return targetRole === RolUsuario.OPERADOR || targetRole === RolUsuario.ALMACEN || targetRole === RolUsuario.CAJERO || targetRole === RolUsuario.REPARTIDOR || targetRole === RolUsuario.ADMIN_SEDE
  if (actorRole === RolUsuario.ADMIN_SEDE) return SITE_ROLES.has(targetRole as RolUsuario) && targetRole !== RolUsuario.ADMIN_SEDE
  return false
}

export function assertCanAssignRole(actorRole: RolUsuario | string | undefined, targetRole: RolUsuario | string | undefined) {
  if (!canAssignRole(actorRole, targetRole)) {
    throw new ForbiddenException({ statusCode: 403, code: 'USER_ROLE_ESCALATION_FORBIDDEN', message: 'El actor no puede asignar el rol solicitado', details: { actorRole, targetRole, globalRoles: [...GLOBAL_ROLES] } })
  }
}
