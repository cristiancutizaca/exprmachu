import { ForbiddenException } from '@nestjs/common'
import { RolUsuario } from '../database/entities/usuario.entity'
import { assertCanAssignRole, canAssignRole } from './role-policy'

describe('role policy', () => {
  it('bloquea ADMIN_SEDE -> AUDITOR', () => {
    expect(canAssignRole(RolUsuario.ADMIN_SEDE, RolUsuario.AUDITOR)).toBe(false)
    expect(() => assertCanAssignRole(RolUsuario.ADMIN_SEDE, RolUsuario.AUDITOR)).toThrow(ForbiddenException)
  })

  it('permite a ADMIN_SEDE administrar roles operativos de sede', () => {
    expect(canAssignRole(RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR)).toBe(true)
    expect(canAssignRole(RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN)).toBe(true)
    expect(canAssignRole(RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO)).toBe(true)
  })

  it('reserva SUPERADMIN para SUPERADMIN', () => {
    expect(canAssignRole(RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)).toBe(false)
    expect(canAssignRole(RolUsuario.SUPERADMIN, RolUsuario.SUPERADMIN)).toBe(true)
  })
})
