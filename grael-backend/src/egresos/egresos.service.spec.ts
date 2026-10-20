import { Egreso, EstadoEgreso } from '../database/entities/egreso.entity'
import { CajaSesion, EstadoCajaSesion } from '../database/entities/caja.entity'
import { RolUsuario } from '../database/entities/usuario.entity'
import { EgresosService } from './egresos.service'

function buildService() {
  const repo: any = { create: jest.fn((payload: any) => payload), save: jest.fn(async (value: any) => value), findOneBy: jest.fn() }
  const cajaRepo: any = {}
  const movimientoRepo: any = {}
  const usuarioRepo: any = { findOneBy: jest.fn() }
  const sedeRepo: any = { findOneBy: jest.fn() }
  const auditRepo: any = { create: jest.fn((payload: any) => payload), save: jest.fn(async (value: any) => value) }
  const dataSource: any = { transaction: jest.fn() }
  return { service: new EgresosService(repo, cajaRepo, movimientoRepo, usuarioRepo, sedeRepo, auditRepo, dataSource), repo, usuarioRepo, sedeRepo, dataSource }
}

describe('EgresosService V5', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rechaza la autoaprobación del solicitante', async () => {
    const { service, dataSource } = buildService()
    const egreso: any = { id: 'egreso-1', sedeId: 'sede-1', estado: EstadoEgreso.PENDIENTE, afectaCaja: false, usuarioSolicitaId: 'user-1', monto: 50 }
    const usuario: any = { id: 'user-1', sedeId: 'sede-1', rol: RolUsuario.ADMIN_SEDE }
    const manager: any = {
      findOne: jest.fn().mockResolvedValue(egreso),
      findOneBy: jest.fn().mockResolvedValue(usuario),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))

    await expect(service.aprobar('egreso-1', {}, 'user-1', { sub: 'user-1', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-1' }))
      .rejects.toThrow('autoaprobación')
  })

  it('exige caja abierta cuando el egreso afecta caja', async () => {
    const { service, dataSource } = buildService()
    const egreso: any = { id: 'egreso-1', sedeId: 'sede-1', estado: EstadoEgreso.PENDIENTE, afectaCaja: true, usuarioSolicitaId: 'user-1', monto: 50 }
    const usuario: any = { id: 'user-2', sedeId: 'sede-1', rol: RolUsuario.ADMIN_SEDE }
    const manager: any = {
      findOne: jest.fn().mockImplementation((entity: any) => entity === Egreso ? egreso : null),
      findOneBy: jest.fn().mockResolvedValue(usuario),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))

    await expect(service.aprobar('egreso-1', {}, 'user-2', { sub: 'user-2', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-1' }))
      .rejects.toThrow('caja abierta')
  })

  it('rechaza la caja cerrada aunque se envíe cajaSesionId manualmente', async () => {
    const { service, dataSource } = buildService()
    const egreso: any = { id: 'egreso-1', sedeId: 'sede-1', estado: EstadoEgreso.PENDIENTE, afectaCaja: true, usuarioSolicitaId: 'user-1', monto: 50 }
    const usuario: any = { id: 'user-2', sedeId: 'sede-1', rol: RolUsuario.ADMIN_SEDE }
    const caja: any = { id: 'caja-1', sedeId: 'sede-1', estado: EstadoCajaSesion.CERRADA }
    const manager: any = {
      findOne: jest.fn().mockImplementation((entity: any) => entity === Egreso ? egreso : caja),
      findOneBy: jest.fn().mockResolvedValue(usuario),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))

    await expect(service.aprobar('egreso-1', { cajaSesionId: 'caja-1' }, 'user-2', { sub: 'user-2', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-1' }))
      .rejects.toThrow('caja cerrada')
  })

  it('rechaza una caja abierta de otra sede', async () => {
    const { service, dataSource } = buildService()
    const egreso: any = { id: 'egreso-1', sedeId: 'sede-1', estado: EstadoEgreso.PENDIENTE, afectaCaja: true, usuarioSolicitaId: 'user-1', monto: 50 }
    const usuario: any = { id: 'user-2', sedeId: 'sede-1', rol: RolUsuario.ADMIN_SEDE }
    const caja: any = { id: 'caja-1', sedeId: 'sede-2', estado: EstadoCajaSesion.ABIERTA }
    const manager: any = {
      findOne: jest.fn().mockImplementation((entity: any) => entity === Egreso ? egreso : caja),
      findOneBy: jest.fn().mockResolvedValue(usuario),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))

    await expect(service.aprobar('egreso-1', { cajaSesionId: 'caja-1' }, 'user-2', { sub: 'user-2', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-1' }))
      .rejects.toThrow('no pertenece')
  })

  it('rechaza solicitar un egreso para otra sede', async () => {
    const { service, dataSource } = buildService()
    const usuario: any = { id: 'user-1', sedeId: 'sede-1', rol: RolUsuario.ADMIN_SEDE }
    const manager: any = { findOneBy: jest.fn().mockResolvedValue(usuario) }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))

    await expect(service.crear({ sedeId: 'sede-2', monto: 25, concepto: 'Prueba', afectaCaja: false }, 'user-1', { sub: 'user-1', rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-1' }))
      .rejects.toThrow('otra sede')
  })
})
