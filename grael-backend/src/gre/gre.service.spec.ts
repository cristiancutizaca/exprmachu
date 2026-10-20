import { BadRequestException } from '@nestjs/common'
import { GreService } from './gre.service'
import { TipoComprobante } from '../database/entities/operaciones.entity'
import { RolUsuario } from '../database/entities/usuario.entity'

describe('GreService', () => {
  const ticketRepo: any = { findOne: jest.fn() }
  const comprobanteRepo: any = { create: jest.fn((_entity: any, value: any) => value), save: jest.fn() }
  const dataSource: any = { transaction: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.GRE_PROVIDER
  })

  it('emite CPE mock con XML y correlativo transaccional', async () => {
    const ticket = { id: 'ticket-1', numeroTicket: '301-0000001', total: 118, subTotal: 100, igv: 18, anulado: false, sedeRecepcionId: 'sede-cusco', origen: { nombre: 'CUSCO' }, destino: { nombre: 'LIMA' }, remitente: { razonSocial: 'Cliente', ruc: '20123456789' }, destinatario: { razonSocial: 'Destino' }, mercaderias: [{ descripcion: 'Carga', cantidad: 1, pesoTotal: 10, total: 118 }] }
    ticketRepo.findOne.mockResolvedValue(ticket)
    const manager: any = {
      query: jest.fn(),
      createQueryBuilder: jest.fn(() => ({ select: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(null), getRawOne: jest.fn().mockResolvedValue({ max: null }) })),
      create: jest.fn((_entity: any, value: any) => value),
      save: jest.fn().mockResolvedValue({ id: 'cpe-1', serie: 'F001', numero: '00000001' }),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))
    const service = new GreService(ticketRepo, comprobanteRepo, dataSource)
    const result = await service.emitir({ ticketId: ticket.id, tipo: 'CPE', tipoComprobante: TipoComprobante.FACTURA }, { sub: 'user-1', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-cusco' })
    expect(result.estado).toBe('ACEPTADO_MOCK')
    expect(result.numero).toBe('00000001')
    expect(result.xml).toContain('<Tipo>CPE</Tipo>')
    expect(manager.query).toHaveBeenCalled()
  })

  it('rechaza emitir para ticket anulado', async () => {
    ticketRepo.findOne.mockResolvedValue({ id: 'ticket-2', anulado: true })
    const service = new GreService(ticketRepo, comprobanteRepo, dataSource)
    await expect(service.emitir({ ticketId: 'ticket-2', tipo: 'GRE' }, 'user-1')).rejects.toBeInstanceOf(BadRequestException)
  })
})
