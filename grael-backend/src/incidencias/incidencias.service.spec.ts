import { BadRequestException } from '@nestjs/common'
import { IncidenciasService } from './incidencias.service'
import { DisposicionIncidencia, EstadoIncidencia } from '../database/entities/incidencia.entity'
import { EstadoBulto } from '../database/entities/bulto.entity'
import { TipoMovimientoAlmacen } from '../database/entities/movimiento-almacen.entity'
import { TipoTrackingEvento } from '../database/entities/tracking-evento.entity'
import { RolUsuario } from '../database/entities/usuario.entity'

describe('IncidenciasService V10 — disposición física', () => {
  const repo: any = {}
  const ticketRepo: any = {}
  const bultoRepo: any = {}
  const trackingRepo: any = {}
  const movimientoAlmacenRepo: any = {}
  const usuarioRepo: any = {}
  const auditRepo: any = {}
  const dataSource: any = { transaction: jest.fn() }
  const service = new IncidenciasService(repo, ticketRepo, bultoRepo, trackingRepo, movimientoAlmacenRepo, usuarioRepo, auditRepo, dataSource)
  const supervisor = { sub: 'sup-1', rol: RolUsuario.SUPERVISOR, sedeId: 'sede-1' }

  beforeEach(() => jest.clearAllMocks())

  it('rechaza resolver sin disposición física', async () => {
    await expect(service.resolver('inc-1', { estado: EstadoIncidencia.RESUELTA } as any, 'sup-1', supervisor)).rejects.toBeInstanceOf(BadRequestException)
    expect(dataSource.transaction).not.toHaveBeenCalled()
  })

  it('resuelve incidencia y sincroniza estado físico, tracking y movimiento de almacén', async () => {
    const incidencia: any = { id: 'inc-1', ticketId: 'ticket-1', bultoId: 'bulto-1', sedeId: 'sede-1', estado: EstadoIncidencia.ABIERTA, resolucion: null }
    const bulto: any = { id: 'bulto-1', ticketId: 'ticket-1', sedeActualId: 'sede-1', estado: EstadoBulto.FALTANTE }
    const manager: any = {
      findOne: jest.fn().mockResolvedValueOnce(incidencia).mockResolvedValueOnce(bulto),
      findOneBy: jest.fn().mockResolvedValue({ id: 'sup-1', rol: RolUsuario.SUPERVISOR, sedeId: 'sede-1' }),
      create: jest.fn((_entity: any, value: any) => value),
      save: jest.fn().mockImplementation((_entity: any, value: any) => value),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))

    const result = await service.resolver('inc-1', { estado: EstadoIncidencia.RESUELTA, disposicion: DisposicionIncidencia.REINGRESADO_ALMACEN, resolucion: 'Reingreso confirmado' }, 'sup-1', supervisor)

    expect(result.disposicion).toBe(DisposicionIncidencia.REINGRESADO_ALMACEN)
    expect(bulto.estado).toBe(EstadoBulto.EN_ALMACEN)
    expect(manager.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tipoEvento: TipoTrackingEvento.INGRESO_ALMACEN, bultoId: 'bulto-1' }))
    expect(manager.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tipo: TipoMovimientoAlmacen.INGRESO, referenciaId: 'inc-1' }))
  })

  it('permite disposición sin cambio físico dejando trazabilidad administrativa', async () => {
    const incidencia: any = { id: 'inc-2', ticketId: 'ticket-1', bultoId: null, sedeId: 'sede-1', estado: EstadoIncidencia.ABIERTA }
    const manager: any = {
      findOne: jest.fn().mockResolvedValue(incidencia),
      findOneBy: jest.fn().mockResolvedValue({ id: 'sup-1', rol: RolUsuario.SUPERVISOR, sedeId: 'sede-1' }),
      create: jest.fn((_entity: any, value: any) => value),
      save: jest.fn().mockImplementation((_entity: any, value: any) => value),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))
    const result = await service.resolver('inc-2', { estado: EstadoIncidencia.CERRADA, disposicion: DisposicionIncidencia.SIN_CAMBIO_FISICO, resolucion: 'No modifica custodia' }, 'sup-1', supervisor)
    expect(result.disposicion).toBe(DisposicionIncidencia.SIN_CAMBIO_FISICO)
    expect(manager.save).toHaveBeenCalledTimes(2)
  })
})
