import { Injectable } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import { Ticket, EstadoTicket } from '../database/entities/ticket.entity'
import { EstadoBulto } from '../database/entities/bulto.entity'

@Injectable()
export class TicketDeliveryStateService {
  async recalculate(manager: EntityManager, ticketId: string): Promise<Ticket | null> {
    const ticket = await manager.findOne(Ticket, { where: { id: ticketId }, relations: ['bultos'] })
    if (!ticket || ticket.anulado) return ticket
    const active = (ticket.bultos || []).filter(bulto => bulto.estado !== EstadoBulto.ANULADO)
    if (active.length > 0 && active.every(bulto => bulto.estado === EstadoBulto.ENTREGADO)) {
      ticket.estado = EstadoTicket.ENTREGADO
    } else if (ticket.estado === EstadoTicket.EN_REPARTO || active.some(bulto => bulto.estado === EstadoBulto.EN_REPARTO)) {
      ticket.estado = EstadoTicket.EN_REPARTO
    }
    return manager.save(Ticket, ticket)
  }
}
