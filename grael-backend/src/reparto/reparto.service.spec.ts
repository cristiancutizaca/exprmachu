import { RepartoService } from './reparto.service'
import { PlanillaReparto, PlanillaRepartoDetalle, EstadoPlanillaReparto, EstadoIntentoReparto } from '../database/entities/reparto.entity'
import { Ticket, EstadoTicket, TipoEntrega } from '../database/entities/ticket.entity'
import { Bulto, EstadoBulto } from '../database/entities/bulto.entity'
import { Usuario, RolUsuario } from '../database/entities/usuario.entity'

function buildService() {
  const repo: any = { createQueryBuilder: jest.fn(), findOne: jest.fn(), save: jest.fn(async (value: any) => value) }
  const detalleRepo: any = { find: jest.fn(), findBy: jest.fn() }
  const ticketRepo: any = {}
  const bultoRepo: any = {}
  const usuarioRepo: any = {}
  const vehiculoRepo: any = {}
  const sedeRepo: any = {}
  const trackingRepo: any = {}
  const auditRepo: any = {}
  const dataSource: any = { transaction: jest.fn() }
  return { service: new RepartoService(repo, detalleRepo, ticketRepo, bultoRepo, usuarioRepo, vehiculoRepo, sedeRepo, trackingRepo, auditRepo, dataSource, { recalculate: jest.fn() } as any), repo, detalleRepo, dataSource }
}

describe('RepartoService V4', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rechaza tickets que no son de reparto o no están listos', async () => {
    const { service, dataSource } = buildService()
    const usuario: any = { id: 'user-1', sedeId: 'sede-1', rol: RolUsuario.ADMIN_SEDE }
    const manager: any = {
      findOneBy: jest.fn().mockImplementation((entity: any, where: any) => {
        if (where?.id === 'user-1') return usuario
        if (where?.id === 'sede-1') return { id: 'sede-1' }
        return null
      }),
      find: jest.fn().mockResolvedValue([{ id: 'ticket-1', numeroTicket: 'T-1', tipoEntrega: TipoEntrega.AGENCIA, estado: EstadoTicket.PENDIENTE, anulado: false, bultos: [] }]),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))

    await expect(service.crear({ sedeId: 'sede-1', ticketIds: ['ticket-1'] }, 'user-1', { sub: 'user-1', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-1' }))
      .rejects.toThrow('no está listo para reparto')
  })

  it('inicia la planilla dentro de una transacción y mueve tickets y bultos a reparto', async () => {
    const { service, dataSource } = buildService()
    const planilla: any = { id: 'plan-1', sedeId: 'sede-1', estado: EstadoPlanillaReparto.ASIGNADO, vehiculoId: 'veh-1', repartidorId: 'rep-1' }
    const detalle: any = { id: 'det-1', planillaId: 'plan-1', ticketId: 'ticket-1', bultoId: 'bulto-1', estado: EstadoIntentoReparto.PENDIENTE }
    const bulto: any = { id: 'bulto-1', estado: EstadoBulto.LISTO_RECOJO }
    const ticket: any = { id: 'ticket-1', estado: EstadoTicket.LISTO_REPARTO }
    const usuario: any = { id: 'rep-1', rol: RolUsuario.REPARTIDOR, sedeId: 'sede-1' }
    const manager: any = {
      findOne: jest.fn().mockResolvedValue(planilla),
      find: jest.fn().mockResolvedValue([detalle]),
      findOneBy: jest.fn().mockImplementation((entity: any, where: any) => {
        if (entity === Usuario && where?.id === 'rep-1') return usuario
        if (entity === Bulto && where?.id === 'bulto-1') return bulto
        if (entity === Ticket && where?.id === 'ticket-1') return ticket
        return null
      }),
      findOneByOrFail: jest.fn().mockImplementation((entity: any) => entity === Bulto ? bulto : ticket),
      save: jest.fn(async (_entity: any, value: any) => value),
      create: jest.fn((_entity: any, payload: any) => payload),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))

    await service.iniciar('plan-1', 'rep-1', { sub: 'rep-1', rol: RolUsuario.REPARTIDOR, sedeId: 'sede-1' })

    expect(dataSource.transaction).toHaveBeenCalledTimes(1)
    expect(planilla.estado).toBe(EstadoPlanillaReparto.EN_RUTA)
    expect(bulto.estado).toBe(EstadoBulto.EN_REPARTO)
    expect(ticket.estado).toBe(EstadoTicket.EN_REPARTO)
  })
})

