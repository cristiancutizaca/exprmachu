import { BadRequestException, Injectable } from '@nestjs/common'
import { EstadoTicket } from '../database/entities/ticket.entity'

const TRANSITIONS: Record<EstadoTicket, readonly EstadoTicket[]> = {
  [EstadoTicket.PENDIENTE]: [EstadoTicket.EN_TRANSITO, EstadoTicket.DESEMBARQUE_EN_DESTINO, EstadoTicket.ANULADO],
  [EstadoTicket.EN_TRANSITO]: [EstadoTicket.DESEMBARQUE_EN_DESTINO, EstadoTicket.ANULADO],
  [EstadoTicket.DESEMBARQUE_EN_DESTINO]: [EstadoTicket.LISTO_REPARTO, EstadoTicket.ENTREGADO, EstadoTicket.ANULADO],
  [EstadoTicket.LISTO_REPARTO]: [EstadoTicket.EN_REPARTO, EstadoTicket.ENTREGADO, EstadoTicket.ANULADO],
  [EstadoTicket.EN_REPARTO]: [EstadoTicket.REPROGRAMADO, EstadoTicket.ENTREGADO, EstadoTicket.ANULADO],
  [EstadoTicket.REPROGRAMADO]: [EstadoTicket.EN_REPARTO, EstadoTicket.ANULADO],
  [EstadoTicket.ENTREGADO]: [],
  [EstadoTicket.ANULADO]: [],
}

@Injectable()
export class TicketWorkflowService {
  canTransition(from: EstadoTicket, to: EstadoTicket): boolean {
    return from === to || TRANSITIONS[from]?.includes(to) === true
  }

  assertTransition(from: EstadoTicket, to: EstadoTicket): void {
    if (from === to) return
    if (!this.canTransition(from, to)) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'TICKET_INVALID_STATE',
        message: `El ticket no puede pasar de ${from} a ${to}`,
        details: { from, to },
      })
    }
  }

  allowedTransitions(from: EstadoTicket): EstadoTicket[] {
    return [...(TRANSITIONS[from] || [])]
  }
}
