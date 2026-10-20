import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { BultosService } from './bultos.service'
import { Bulto, EstadoBulto } from '../database/entities/bulto.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { TrackingEvento } from '../database/entities/tracking-evento.entity'
import { Usuario, RolUsuario } from '../database/entities/usuario.entity'
import { AuditLog } from '../database/entities/audit-log.entity'

describe('BultosService V10', () => {
  const bultoRepo: any = { findOne: jest.fn() }
  const ticketRepo: any = {}
  const trackingRepo: any = {}
  const usuarioRepo: any = {}
  const dataSource: any = { transaction: jest.fn() }
  const service = new BultosService(bultoRepo, ticketRepo, trackingRepo, usuarioRepo, dataSource)

  beforeEach(() => jest.clearAllMocks())

  it('crea un bulto con sedeActual de recepción y evento de tracking', async () => {
    const ticket = { id: 'ticket-1', numeroTicket: 'TK-001', anulado: false, sedeRecepcionId: 'sede-lima', usuarioCreacion: { sedeId: 'sede-cusco' } }
    const saved = { id: 'bulto-1', ticketId: ticket.id, codigo: 'TK-001-001', numero: 1, estado: EstadoBulto.RECEPCIONADO, sedeActualId: 'sede-lima' }
    const manager: any = {
      findOne: jest.fn().mockResolvedValueOnce(ticket).mockResolvedValueOnce(saved),
      findOneBy: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'user-1' }),
      create: jest.fn((_entity: any, payload: any) => payload),
      save: jest.fn().mockResolvedValueOnce(saved).mockResolvedValueOnce({ id: 'tracking-1' }),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))
    const result = await service.crear({ ticketId: ticket.id, numero: 1 }, 'user-1')
    expect(result).toEqual(saved)
    expect(manager.create).toHaveBeenCalledWith(Bulto, expect.objectContaining({ sedeActualId: 'sede-lima' }))
    expect(manager.create).toHaveBeenCalledWith(TrackingEvento, expect.objectContaining({ ticketId: ticket.id, bultoId: saved.id }))
  })

  it('rechaza crear bulto para ticket inexistente o anulado', async () => {
    const manager: any = { findOne: jest.fn().mockResolvedValue(null) }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))
    await expect(service.crear({ ticketId: 'missing' })).rejects.toBeInstanceOf(NotFoundException)
    manager.findOne.mockResolvedValue({ id: 'ticket-1', numeroTicket: 'TK-001', anulado: true })
    await expect(service.crear({ ticketId: 'ticket-1' })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rechaza transiciones no permitidas y permite una válida sin actor autenticado', async () => {
    const manager: any = {
      findOneBy: jest.fn().mockResolvedValue({ id: 'bulto-1', ticketId: 'ticket-1', estado: EstadoBulto.RECEPCIONADO }),
      save: jest.fn().mockImplementation((_entity: any, value: any) => value),
      create: jest.fn((_entity: any, payload: any) => payload),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))
    await expect(service.cambiarEstado('bulto-1', EstadoBulto.ENTREGADO)).rejects.toBeInstanceOf(BadRequestException)
    const result = await service.cambiarEstado('bulto-1', EstadoBulto.EN_ALMACEN, 'user-1', 'Ingreso')
    expect(result.estado).toBe(EstadoBulto.EN_ALMACEN)
    expect(manager.save).toHaveBeenCalledTimes(2)
  })

  it('bloquea el bypass de estado para operador o almacén aun con transición válida', async () => {
    await expect(service.cambiarEstado('bulto-1', EstadoBulto.EN_ALMACEN, 'user-1', 'Ingreso', { sub: 'user-1', rol: RolUsuario.ALMACEN, sedeId: 'sede-lima' }, false, 'operación normal')).rejects.toBeInstanceOf(BadRequestException)
    expect(dataSource.transaction).not.toHaveBeenCalled()
  })

  it('permite corrección administrativa auditada sin crear tracking físico', async () => {
    const bulto: any = { id: 'bulto-1', ticketId: 'ticket-1', sedeActualId: 'sede-lima', estado: EstadoBulto.EN_ALMACEN }
    const ticket: any = { id: 'ticket-1', sedeRecepcionId: 'sede-lima', usuarioCreacion: { sedeId: 'sede-lima' } }
    const manager: any = {
      findOne: jest.fn().mockResolvedValueOnce(bulto).mockResolvedValueOnce(ticket),
      save: jest.fn().mockImplementation((_entity: any, value: any) => value),
      create: jest.fn((_entity: any, payload: any) => payload),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))
    const result = await service.corregirEstado('bulto-1', EstadoBulto.OBSERVADO, 'Ajuste físico', { sub: 'sup-1', rol: RolUsuario.SUPERVISOR, sedeId: 'sede-lima' })
    expect(result.estado).toBe(EstadoBulto.OBSERVADO)
    expect(manager.create).toHaveBeenCalledWith(AuditLog, expect.objectContaining({ accion: 'CORRECCION_ADMINISTRATIVA', metadata: expect.objectContaining({ sinEventoFisico: true }) }))
    expect(manager.create).not.toHaveBeenCalledWith(TrackingEvento, expect.anything())
  })

  it('legacy autenticado delega a corrección administrativa y exige motivo', async () => {
    await expect(service.cambiarEstado('bulto-1', EstadoBulto.OBSERVADO, 'sup-1', 'x', { sub: 'sup-1', rol: RolUsuario.SUPERVISOR, sedeId: 'sede-lima' }, true, 'x')).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.cambiarEstado('bulto-1', EstadoBulto.OBSERVADO, 'sup-1', 'x', { sub: 'sup-1', rol: RolUsuario.SUPERVISOR, sedeId: 'sede-lima' }, true, 'Corrección histórica')).rejects.toBeInstanceOf(NotFoundException)
  })
})
