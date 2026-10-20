import { ForbiddenException } from '@nestjs/common'
import { InventarioService } from './inventario.service'
import { EstadoBulto } from '../database/entities/bulto.entity'
import { RolUsuario } from '../database/entities/usuario.entity'

function queryBuilder() {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getMany: jest.fn().mockResolvedValue([]),
  }
  return qb
}

describe('InventarioService V6', () => {
  const bultoRepo: any = { createQueryBuilder: jest.fn() }
  const movimientoRepo: any = { createQueryBuilder: jest.fn() }
  const almacenRepo: any = {}
  const ubicacionRepo: any = {}
  const trackingRepo: any = {}
  const usuarioRepo: any = {}
  const dataSource: any = { transaction: jest.fn() }
  const service = new InventarioService(bultoRepo, movimientoRepo, almacenRepo, ubicacionRepo, trackingRepo, usuarioRepo, dataSource)

  beforeEach(() => jest.clearAllMocks())

  it('fuerza el scope de sede del usuario en el listado', async () => {
    const qb = queryBuilder(); bultoRepo.createQueryBuilder.mockReturnValue(qb)
    await service.listar({ page: 1, limit: 20 }, { sub: 'u-cusco', rol: RolUsuario.ALMACEN, sedeId: 'sede-cusco' })
    expect(qb.andWhere).toHaveBeenCalledWith('b.sede_actual_id = :scopeSedeId', { scopeSedeId: 'sede-cusco' })
  })

  it('rechaza un movimiento directo de Cusco hacia almacén de Lima', async () => {
    const bulto = { id: 'b-1', ticketId: 't-1', sedeActualId: 'sede-cusco', estado: EstadoBulto.EN_ALMACEN }
    const destino = { id: 'alm-lima', sedeId: 'sede-lima', estado: 'ACTIVO' }
    const ubicacion = { id: 'ub-lima', almacenId: 'alm-lima', activo: true }
    const manager: any = { findOne: jest.fn().mockResolvedValueOnce(bulto), findOneBy: jest.fn().mockResolvedValueOnce(destino).mockResolvedValueOnce(ubicacion) }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))
    const user = { sub: 'u-cusco', rol: RolUsuario.ALMACEN, sedeId: 'sede-cusco' }
    await expect(service.mover({ bultoId: 'b-1', almacenDestinoId: 'alm-lima', ubicacionDestinoId: 'ub-lima', motivo: 'cambio' } as any, 'u-cusco', user)).rejects.toBeInstanceOf(ForbiddenException)
  })
})
