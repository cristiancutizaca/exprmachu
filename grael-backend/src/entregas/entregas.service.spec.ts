import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { EntregasService } from './entregas.service'
import { EstadoBulto } from '../database/entities/bulto.entity'
import { EstadoEntrega, TipoEntregaV2 } from '../database/entities/entrega.entity'
import { RolUsuario } from '../database/entities/usuario.entity'

describe('EntregasService V10', () => {
  const repo: any = { create: jest.fn(value => value), save: jest.fn(async value => value), findOne: jest.fn() }
  const ticketRepo: any = { findOne: jest.fn() }
  const bultoRepo: any = { findOne: jest.fn() }
  const trackingRepo: any = {}
  const usuarioRepo: any = { findOneBy: jest.fn() }
  const auditRepo: any = {}
  const dataSource: any = { transaction: jest.fn() }
  const service = new EntregasService(repo, ticketRepo, bultoRepo, trackingRepo, usuarioRepo, auditRepo, dataSource)
  const operadorCusco = { sub: 'u-cusco', rol: RolUsuario.REPARTIDOR, sedeId: 'sede-cusco' }

  beforeEach(() => jest.clearAllMocks())

  function tx(manager: any) { dataSource.transaction.mockImplementation(async (callback: any) => callback(manager)) }

  it('rechaza crear entrega moderna para ticket sin bultos activos', async () => {
    const manager: any = { findOne: jest.fn().mockResolvedValue({ id: 'ticket-1', bultos: [] }) }
    tx(manager)
    await expect(service.crear({ ticketId: 'ticket-1', tipo: TipoEntregaV2.AGENCIA }, 'u-cusco', operadorCusco)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'DELIVERY_BULTO_REQUIRED' }) })
  })

  it('usa sedeActual del bulto y rechaza crear entrega cross-site', async () => {
    const manager: any = { findOne: jest.fn().mockResolvedValueOnce({ id: 'ticket-1', bultos: [{ id: 'bulto-1', estado: EstadoBulto.EN_ALMACEN, sedeActualId: 'sede-lima' }] }).mockResolvedValueOnce({ id: 'bulto-1', ticketId: 'ticket-1', estado: EstadoBulto.EN_ALMACEN, sedeActualId: 'sede-lima' }) }
    tx(manager)
    await expect(service.crear({ ticketId: 'ticket-1', tipo: TipoEntregaV2.AGENCIA }, 'u-cusco', operadorCusco)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('rechaza confirmar entrega si el ticket no tiene bultos activos', async () => {
    const entrega = { id: 'entrega-1', ticketId: 'ticket-1', estado: EstadoEntrega.PROGRAMADA, bultoId: null, sedeId: 'sede-cusco' }
    const manager: any = { findOne: jest.fn().mockResolvedValueOnce(entrega).mockResolvedValueOnce({ id: 'ticket-1', bultos: [] }) }
    tx(manager)
    await expect(service.entregar('entrega-1', { nombreReceptor: 'Cliente', documentoReceptor: '12345678' }, 'u-cusco', operadorCusco)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rechaza dos entregas activas para el mismo bulto', async () => {
    const ticket = { id: 'ticket-1', bultos: [{ id: 'bulto-1', estado: EstadoBulto.EN_ALMACEN, sedeActualId: 'sede-cusco' }] }
    const locked = { id: 'bulto-1', ticketId: 'ticket-1', estado: EstadoBulto.EN_ALMACEN, sedeActualId: 'sede-cusco' }
    const manager: any = { findOne: jest.fn().mockResolvedValueOnce(ticket).mockResolvedValueOnce(locked).mockResolvedValueOnce({ id: 'delivery-old', estado: EstadoEntrega.PROGRAMADA }) }
    tx(manager)
    await expect(service.crear({ ticketId: 'ticket-1', bultoId: 'bulto-1', tipo: TipoEntregaV2.AGENCIA }, 'u-cusco', operadorCusco)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'DELIVERY_ALREADY_ACTIVE' }) })
  })

  it('rechaza confirmar una entrega ya entregada y no permite retroceso', async () => {
    const entrega = { id: 'entrega-1', ticketId: 'ticket-1', estado: EstadoEntrega.ENTREGADA, bultoId: 'bulto-1', sedeId: 'sede-cusco' }
    const manager: any = { findOne: jest.fn().mockResolvedValue(entrega) }
    tx(manager)
    await expect(service.entregar('entrega-1', { nombreReceptor: 'Cliente', documentoReceptor: '12345678' }, 'u-cusco', operadorCusco)).rejects.toMatchObject({ response: expect.objectContaining({ code: 'DELIVERY_ALREADY_CONFIRMED' }) })
  })
})
