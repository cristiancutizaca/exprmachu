import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { TransbordoService } from './transbordo.service'
import { RolUsuario } from '../database/entities/usuario.entity'

function qb() {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
  } as any
}

describe('TransbordoService V6', () => {
  const repo: any = { createQueryBuilder: jest.fn() }
  const dataSource: any = { transaction: jest.fn() }
  const service = new TransbordoService(repo, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, dataSource)

  beforeEach(() => jest.clearAllMocks())

  it('fuerza el scope de sede en el listado', async () => {
    const query = qb(); repo.createQueryBuilder.mockReturnValue(query)
    await service.listar({ page: 1, limit: 20 }, { sub: 'u-cusco', rol: RolUsuario.ALMACEN, sedeId: 'sede-cusco' })
    expect(query.andWhere).toHaveBeenCalledWith('t.sede_id = :scopeSedeId', { scopeSedeId: 'sede-cusco' })
  })

  it('rechaza crear un transbordo en otra sede', async () => {
    const user = { sub: 'u-cusco', rol: RolUsuario.ALMACEN, sedeId: 'sede-cusco' }
    await expect(service.crear({ sedeId: 'sede-lima', origenId: 'origen', destinoId: 'destino', motivo: 'prueba' } as any, user)).rejects.toBeInstanceOf(ForbiddenException)
    expect(dataSource.transaction).not.toHaveBeenCalled()
  })

  it('bloquea saltos directos de estado y solicita lock pesimista', async () => {
    const transbordo = { id: 'tr-1', estado: 'ABIERTO', sedeId: 'sede-cusco', tickets: [] }
    const manager: any = {
      findOne: jest.fn().mockResolvedValue(transbordo),
      save: jest.fn(),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))
    await expect(service.cambiarEstado('tr-1', 'CERRADO' as any, { sub: 'u-cusco', rol: RolUsuario.ALMACEN, sedeId: 'sede-cusco' })).rejects.toBeInstanceOf(BadRequestException)
    expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ lock: { mode: 'pessimistic_write' } }))
    expect(manager.save).not.toHaveBeenCalled()
  })
})
