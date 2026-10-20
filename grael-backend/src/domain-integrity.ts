import { BadRequestException } from '@nestjs/common'
import { Bulto } from './database/entities/bulto.entity'

export function assertTicketBultoIntegrity(ticketId: string, bulto: Pick<Bulto, 'ticketId'> | null | undefined): asserts bulto is Pick<Bulto, 'ticketId'> {
  if (!bulto || bulto.ticketId !== ticketId) {
    throw new BadRequestException({
      statusCode: 400,
      code: 'BULTO_TICKET_MISMATCH',
      message: 'El bulto no pertenece al ticket indicado',
      details: { ticketId, bultoId: (bulto as any)?.id || null },
    })
  }
}
