import { ForbiddenException } from '@nestjs/common'
import type { Ticket } from '../database/entities/ticket.entity'
import { RolUsuario } from '../database/entities/usuario.entity'
import { assertAnySedeAccess, assertSedeAccess, type ScopeUser } from './sede-scope'

type TicketAccessShape = Pick<Ticket, 'sedeRecepcionId' | 'usuarioCreacion' | 'destino' | 'bultos'>

export class TicketAccessPolicy {
  static relevantSedeIds(ticket: TicketAccessShape): string[] {
    const receptionSedeId = ticket.sedeRecepcionId || ticket.usuarioCreacion?.sedeId
    return [
      receptionSedeId,
      ticket.destino?.sedeId,
      ...(ticket.bultos || []).map(bulto => bulto.sedeActualId),
    ].filter((id): id is string => Boolean(id))
  }

  static receptionSedeId(ticket: Pick<Ticket, 'sedeRecepcionId' | 'usuarioCreacion'>): string | undefined {
    return ticket.sedeRecepcionId || ticket.usuarioCreacion?.sedeId
  }

  static assertRead(user: ScopeUser | null | undefined, ticket: TicketAccessShape) {
    assertAnySedeAccess(user, this.relevantSedeIds(ticket), 'consultar el ticket')
  }

  static assertEditReception(user: ScopeUser | null | undefined, ticket: Pick<Ticket, 'sedeRecepcionId' | 'usuarioCreacion'>) {
    const receptionSedeId = this.receptionSedeId(ticket)
    if (!receptionSedeId) throw new ForbiddenException({ statusCode: 403, code: 'RECEPTION_SITE_UNKNOWN', message: 'El ticket no tiene sede de recepción determinable' })
    if (!user || ![RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN].includes(user.rol as RolUsuario)) {
      throw new ForbiddenException({ statusCode: 403, code: 'TICKET_EDIT_FORBIDDEN', message: 'El rol no puede editar la recepción del ticket', details: {} })
    }
    assertSedeAccess(user, receptionSedeId, 'editar la recepción del ticket')
  }

  static assertReceptionMutation(user: ScopeUser | null | undefined, ticket: Pick<Ticket, 'sedeRecepcionId' | 'usuarioCreacion'>) {
    return this.assertEditReception(user, ticket)
  }

  static assertCancel(user: ScopeUser | null | undefined, ticket: Pick<Ticket, 'sedeRecepcionId' | 'usuarioCreacion'>) {
    if (!user || ![RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN].includes(user.rol as RolUsuario)) {
      throw new ForbiddenException({ statusCode: 403, code: 'TICKET_CANCEL_FORBIDDEN', message: 'Solo SUPERVISOR o SUPERADMIN pueden anular tickets', details: {} })
    }
    return this.assertEditReception(user, ticket)
  }

  static assertPayment(user: ScopeUser | null | undefined, paymentSedeId: string) {
    if (!user || ![RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN].includes(user.rol as RolUsuario)) {
      throw new ForbiddenException({ statusCode: 403, code: 'TICKET_PAYMENT_FORBIDDEN', message: 'El rol no puede registrar cobros', details: {} })
    }
    return assertSedeAccess(user, paymentSedeId, 'registrar el cobro')
  }

  static assertOperationalDestinationRead(user: ScopeUser | null | undefined, ticket: TicketAccessShape) {
    return this.assertRead(user, ticket)
  }

  /** @deprecated Generic operation scope is intentionally not equivalent to read. Use an explicit operation method. */
  static assertOperation(user: ScopeUser | null | undefined, ticket: TicketAccessShape) {
    return this.assertEditReception(user, ticket)
  }
}

export default TicketAccessPolicy
