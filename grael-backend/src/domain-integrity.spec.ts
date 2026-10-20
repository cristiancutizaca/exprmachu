import { BadRequestException } from '@nestjs/common'
import { assertTicketBultoIntegrity } from './domain-integrity'

describe('ticket-bulto integrity', () => {
  it('acepta un bulto perteneciente al ticket', () => {
    expect(() => assertTicketBultoIntegrity('ticket-1', { id: 'bulto-1', ticketId: 'ticket-1' } as any)).not.toThrow()
  })

  it('rechaza un bulto cruzado o inexistente', () => {
    expect(() => assertTicketBultoIntegrity('ticket-1', { id: 'bulto-2', ticketId: 'ticket-2' } as any)).toThrow(BadRequestException)
    expect(() => assertTicketBultoIntegrity('ticket-1', null)).toThrow(BadRequestException)
  })
})
