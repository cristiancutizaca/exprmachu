import { BadRequestException } from '@nestjs/common'
import { EstadoTicket } from '../database/entities/ticket.entity'
import { TicketWorkflowService } from './ticket-workflow.service'

describe('TicketWorkflowService', () => {
  const service = new TicketWorkflowService()

  it('permite el flujo operativo principal', () => {
    expect(service.canTransition(EstadoTicket.PENDIENTE, EstadoTicket.EN_TRANSITO)).toBe(true)
    expect(service.canTransition(EstadoTicket.EN_TRANSITO, EstadoTicket.DESEMBARQUE_EN_DESTINO)).toBe(true)
    expect(service.canTransition(EstadoTicket.DESEMBARQUE_EN_DESTINO, EstadoTicket.ENTREGADO)).toBe(true)
  })

  it('rechaza regresar un ticket entregado o anulado', () => {
    expect(service.allowedTransitions(EstadoTicket.ENTREGADO)).toEqual([])
    expect(service.allowedTransitions(EstadoTicket.ANULADO)).toEqual([])
    expect(() => service.assertTransition(EstadoTicket.ENTREGADO, EstadoTicket.EN_TRANSITO)).toThrow(BadRequestException)
  })

  it('permite anulación solo antes de la entrega', () => {
    expect(service.canTransition(EstadoTicket.PENDIENTE, EstadoTicket.ANULADO)).toBe(true)
    expect(service.canTransition(EstadoTicket.EN_TRANSITO, EstadoTicket.ANULADO)).toBe(true)
    expect(service.canTransition(EstadoTicket.ENTREGADO, EstadoTicket.ANULADO)).toBe(false)
  })
})
