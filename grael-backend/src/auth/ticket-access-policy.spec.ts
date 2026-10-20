import { ForbiddenException } from '@nestjs/common'
import { TicketAccessPolicy } from './ticket-access-policy'
import { RolUsuario } from '../database/entities/usuario.entity'

const localCusco = { sub: 'u-cusco', rol: RolUsuario.ALMACEN, sedeId: 'sede-cusco' }
const ticket = (overrides: any = {}) => ({
  sedeRecepcionId: 'sede-lima',
  usuarioCreacion: { sedeId: 'sede-lima' },
  destino: { sedeId: 'sede-cusco' },
  bultos: [{ sedeActualId: 'sede-cusco' }],
  ...overrides,
}) as any

describe('TicketAccessPolicy', () => {
  it('permite lectura en la sede de recepción', () => {
    expect(() => TicketAccessPolicy.assertRead({ ...localCusco, sedeId: 'sede-lima' }, ticket())).not.toThrow()
  })

  it('preserva la recepción histórica aunque el creador sea trasladado', () => {
    const historicalTicket = ticket({ usuarioCreacion: { sedeId: 'sede-cusco' } })
    expect(TicketAccessPolicy.receptionSedeId(historicalTicket)).toBe('sede-lima')
    expect(() => TicketAccessPolicy.assertEditReception({ sub: 'admin-cusco', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-cusco' }, historicalTicket)).toThrow(ForbiddenException)
  })

  it('permite lectura en la sede destino o custodia actual', () => {
    expect(() => TicketAccessPolicy.assertRead(localCusco, ticket())).not.toThrow()
  })

  it('rechaza una sede sin relación con recepción, destino o custodia', () => {
    expect(() => TicketAccessPolicy.assertRead({ ...localCusco, sedeId: 'sede-arequipa' }, ticket())).toThrow(ForbiddenException)
  })

  it('permite a un rol global leer sin depender de una sede local', () => {
    expect(() => TicketAccessPolicy.assertRead({ sub: 'auditor', rol: RolUsuario.AUDITOR, sedeId: null }, ticket())).not.toThrow()
  })

  it('no confunde lectura de custodia con permiso para editar recepción', () => {
    expect(() => TicketAccessPolicy.assertEditReception(localCusco, ticket())).toThrow(ForbiddenException)
    expect(() => TicketAccessPolicy.assertEditReception({ sub: 'admin-lima', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-lima' }, ticket())).not.toThrow()
    expect(() => TicketAccessPolicy.assertEditReception({ sub: 'admin-cusco', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-cusco' }, ticket())).toThrow(ForbiddenException)
  })

  it('solo permite anular a supervisor/superadmin de la sede de recepción', () => {
    expect(() => TicketAccessPolicy.assertCancel({ sub: 'super-cusco', rol: RolUsuario.SUPERVISOR, sedeId: 'sede-cusco' }, ticket())).not.toThrow()
    expect(() => TicketAccessPolicy.assertCancel({ sub: 'super-lima', rol: RolUsuario.SUPERVISOR, sedeId: 'sede-lima' }, ticket())).not.toThrow()
    expect(() => TicketAccessPolicy.assertCancel({ sub: 'admin-lima', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-lima' }, ticket())).toThrow(ForbiddenException)
  })

  it('limita cobros a la sede de caja y a perfiles financieros', () => {
    expect(() => TicketAccessPolicy.assertPayment({ sub: 'cajero-cusco', rol: RolUsuario.CAJERO, sedeId: 'sede-cusco' }, 'sede-cusco')).not.toThrow()
    expect(() => TicketAccessPolicy.assertPayment({ sub: 'cajero-cusco', rol: RolUsuario.CAJERO, sedeId: 'sede-cusco' }, 'sede-lima')).toThrow(ForbiddenException)
    expect(() => TicketAccessPolicy.assertPayment(localCusco, 'sede-cusco')).toThrow(ForbiddenException)
  })
})
