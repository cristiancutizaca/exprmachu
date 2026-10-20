import { ForbiddenException } from '@nestjs/common'
import { RolUsuario } from '../database/entities/usuario.entity'

export type ScopeUser = { sub?: string; rol?: RolUsuario | string; sedeId?: string | null }

export const GLOBAL_ROLES: RolUsuario[] = [RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.AUDITOR]

export const ROLE_PERMISSIONS: Record<RolUsuario, string[]> = {
  [RolUsuario.SUPERADMIN]: ['*'],
  [RolUsuario.SUPERVISOR]: ['read:any', 'operate:any', 'admin:any', 'audit:read'],
  [RolUsuario.ADMIN_SEDE]: ['read:sede', 'operate:sede', 'admin:sede', 'cash:sede', 'gre:sede'],
  [RolUsuario.OPERADOR]: ['read:sede', 'reception:sede', 'tickets:sede', 'tracking:sede'],
  [RolUsuario.ALMACEN]: ['read:sede', 'warehouse:sede', 'loading:sede', 'unloading:sede'],
  [RolUsuario.CAJERO]: ['read:sede', 'cash:sede', 'payments:sede', 'documents:sede'],
  [RolUsuario.REPARTIDOR]: ['read:sede', 'delivery:sede'],
  [RolUsuario.AUDITOR]: ['audit:read', 'read:any'],
}

export function isGlobalRole(user?: ScopeUser | null): boolean {
  return Boolean(user?.rol && GLOBAL_ROLES.includes(user.rol as RolUsuario))
}

export function assertSedeAccess(user: ScopeUser | null | undefined, sedeId: string | null | undefined, operation = 'operar') {
  if (!sedeId || isGlobalRole(user)) return
  if (!user?.sedeId || user.sedeId !== sedeId) {
    throw new ForbiddenException({ statusCode: 403, code: 'SEDE_FORBIDDEN', message: `No puede ${operation} recursos de otra sede`, details: { sedeId } })
  }
}

/** Permite lectura cuando el recurso pertenece a cualquiera de sus sedes relevantes. */
export function assertAnySedeAccess(user: ScopeUser | null | undefined, sedeIds: Array<string | null | undefined>, operation = 'consultar') {
  if (isGlobalRole(user)) return
  const relevant = sedeIds.filter((id): id is string => Boolean(id))
  if (!relevant.length || !user?.sedeId || !relevant.includes(user.sedeId)) {
    throw new ForbiddenException({ statusCode: 403, code: 'SEDE_FORBIDDEN', message: `No puede ${operation} recursos fuera de su sede`, details: { sedeIds: relevant } })
  }
}

export function assertReceptionSedeAccess(user: ScopeUser | null | undefined, sedeId: string | null | undefined, operation = 'operar la recepción') {
  assertSedeAccess(user, sedeId, operation)
}

export function assertCustodySedeAccess(user: ScopeUser | null | undefined, sedeId: string | null | undefined, operation = 'operar la custodia') {
  assertSedeAccess(user, sedeId, operation)
}

export function assertManifestOriginAccess(user: ScopeUser | null | undefined, sedeId: string | null | undefined, operation = 'operar el origen del manifiesto') {
  assertSedeAccess(user, sedeId, operation)
}

export function assertManifestDestinationAccess(user: ScopeUser | null | undefined, sedeId: string | null | undefined, operation = 'operar el destino del manifiesto') {
  assertSedeAccess(user, sedeId, operation)
}

export function assertPaymentSedeAccess(user: ScopeUser | null | undefined, sedeId: string | null | undefined, operation = 'registrar el cobro') {
  assertSedeAccess(user, sedeId, operation)
}

export function effectiveSedeId(user: ScopeUser | null | undefined, requestedSedeId?: string | null): string | undefined {
  if (isGlobalRole(user)) return requestedSedeId || undefined
  return user?.sedeId || undefined
}

export function assertRolePermission(user: ScopeUser | null | undefined, permission: string) {
  const role = user?.rol as RolUsuario
  const permissions = ROLE_PERMISSIONS[role] || []
  if (!permissions.includes('*') && !permissions.includes(permission)) {
    throw new ForbiddenException({ statusCode: 403, code: 'PERMISSION_FORBIDDEN', message: 'El rol no tiene permiso para esta operación', details: { permission } })
  }
}
