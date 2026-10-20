import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { ComprobantesService } from './comprobantes.service'
import { TipoComprobante } from '../database/entities/operaciones.entity'
import { EstadoComprobante } from '../common/dto/comprobante.dto'
import { RolUsuario } from '../database/entities/usuario.entity'

const adminCusco = { sub: 'u-cusco', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-cusco' }
const supervisor = { sub: 'u-supervisor', rol: RolUsuario.SUPERVISOR, sedeId: null }

function makeService(manager: any, repo?: any) {
  const dataSource: any = { transaction: jest.fn((callback: any) => callback(manager)) }
  const repository = repo || { createQueryBuilder: jest.fn() }
  return new ComprobantesService(repository, dataSource)
}

describe('ComprobantesService V8', () => {
  it('rechaza anulación cross-site aunque el bulto esté bajo custodia local', async () => {
    const comprobante = { id: 'c-1', estado: EstadoComprobante.EMITIDO, sedeEmisionId: 'sede-lima', ticket: { id: 't-1', sedeRecepcionId: 'sede-lima', bultos: [{ sedeActualId: 'sede-cusco' }] } }
    const manager: any = { findOne: jest.fn().mockResolvedValue(comprobante) }
    await expect(makeService(manager).anular('c-1', 'Motivo válido', adminCusco)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('rechaza roles locales aunque pertenezcan a la sede de emisión', async () => {
    const comprobante = { id: 'c-1', estado: EstadoComprobante.EMITIDO, sedeEmisionId: 'sede-cusco', ticket: { id: 't-1', sedeRecepcionId: 'sede-cusco', bultos: [] } }
    const manager: any = { findOne: jest.fn().mockResolvedValue(comprobante) }
    await expect(makeService(manager).anular('c-1', 'Motivo válido', { ...adminCusco, sedeId: 'sede-cusco' })).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('exige motivo antes de abrir la transacción', async () => {
    const manager: any = { findOne: jest.fn() }
    await expect(makeService(manager).anular('c-1', ' ', supervisor)).rejects.toBeInstanceOf(BadRequestException)
    expect(manager.findOne).not.toHaveBeenCalled()
  })

  it('anula como ANULADO_MOCK y registra auditoría dentro de la transacción', async () => {
    const comprobante: any = { id: 'c-1', estado: EstadoComprobante.EMITIDO, sedeEmisionId: 'sede-cusco', tipo: TipoComprobante.BOLETA, serie: 'B001', numero: '12', ticket: { id: 't-1', sedeRecepcionId: 'sede-cusco', bultos: [] } }
    const manager: any = {
      findOne: jest.fn().mockResolvedValue(comprobante),
      create: jest.fn((_entity: any, value: any) => value),
      save: jest.fn((_entity: any, value: any) => Promise.resolve({ ...value, id: value.id || 'audit-1' })),
    }
    const result = await makeService(manager).anular('c-1', 'Corrección documental', supervisor)
    expect(result.estado).toBe('ANULADO_MOCK')
    expect(manager.save).toHaveBeenCalledTimes(2)
    expect(manager.save.mock.calls.some(([, value]: any[]) => value.accion === 'COMPROBANTE_ANULADO_MOCK')).toBe(true)
  })
})
