import { BadRequestException } from '@nestjs/common'
import { PagosService } from './pagos.service'
import { CajaSesion, EstadoCajaSesion, MovimientoCaja, TipoMovimientoCaja } from '../database/entities/caja.entity'
import { MetodoPago } from '../database/entities/operaciones.entity'
import { RolUsuario } from '../database/entities/usuario.entity'

describe('PagosService V10 — ledger de CajaSesion', () => {
  const pagoRepo: any = { findAndCount: jest.fn(), find: jest.fn() }
  const cajaRepo: any = { findOne: jest.fn(), findOneBy: jest.fn(), create: jest.fn(), save: jest.fn() }
  const movimientoRepo: any = { find: jest.fn() }
  const sedeRepo: any = { findOneBy: jest.fn() }
  const usuarioRepo: any = { findOneBy: jest.fn() }
  const auditRepo: any = { create: jest.fn(), save: jest.fn() }
  const dataSource: any = { transaction: jest.fn() }
  const service = new PagosService(pagoRepo, cajaRepo, movimientoRepo, sedeRepo, usuarioRepo, auditRepo, dataSource)
  const user = { sub: 'user-1', rol: RolUsuario.CAJERO, sedeId: 'sede-1' }

  beforeEach(() => jest.clearAllMocks())

  function managerFor(caja: any, usuario: any, movimientos: any[] = []) {
    const manager: any = {
      findOne: jest.fn().mockResolvedValue(caja),
      findOneBy: jest.fn().mockResolvedValue(usuario),
      find: jest.fn().mockResolvedValue(movimientos),
      save: jest.fn().mockImplementation((_entity: any, value: any) => value),
      create: jest.fn((_entity: any, payload: any) => payload),
      query: jest.fn(),
    }
    dataSource.transaction.mockImplementation(async (callback: any) => callback(manager))
    return manager
  }

  it('calcula el efectivo desde el ledger y no duplica el pago', async () => {
    const caja: any = { id: 'caja-1', estado: EstadoCajaSesion.ABIERTA, saldoInicial: 100, saldoEsperado: 100, sedeId: 'sede-1', usuarioAperturaId: 'user-1' }
    const usuario = { id: 'user-1', rol: RolUsuario.CAJERO, sedeId: 'sede-1' }
    const movement: any = { id: 'mov-1', cajaSesionId: 'caja-1', tipo: TipoMovimientoCaja.INGRESO, metodoPago: MetodoPago.EFECTIVO, monto: 25, pagoId: 'pago-1', metadata: {} }
    const manager = managerFor(caja, usuario)
    manager.save.mockImplementation((_entity: any, value: any) => value)
    manager.find.mockResolvedValue([movement])

    const result = await service.registrarMovimiento('caja-1', { tipoMovimiento: TipoMovimientoCaja.INGRESO, monto: 25, metodoPago: MetodoPago.EFECTIVO, concepto: 'Pago ticket', pagoId: 'pago-1' }, 'user-1', user)

    expect(result.monto).toBe(25)
    expect(caja.saldoEsperado).toBe(125)
    expect(manager.save).toHaveBeenCalledWith(CajaSesion, caja)
  })

  it('mantiene el pago digital fuera del efectivo físico', async () => {
    const caja: any = { id: 'caja-1', estado: EstadoCajaSesion.ABIERTA, saldoInicial: 50, saldoEsperado: 50, sedeId: 'sede-1', usuarioAperturaId: 'user-1' }
    const usuario = { id: 'user-1', rol: RolUsuario.CAJERO, sedeId: 'sede-1' }
    const manager = managerFor(caja, usuario)
    manager.find.mockResolvedValue([{ id: 'mov-yape', cajaSesionId: 'caja-1', tipo: TipoMovimientoCaja.INGRESO, metodoPago: MetodoPago.YAPE, monto: 100, pagoId: 'pago-yape', metadata: {} }])

    await service.registrarMovimiento('caja-1', { tipoMovimiento: TipoMovimientoCaja.INGRESO, monto: 100, metodoPago: MetodoPago.YAPE, concepto: 'Pago digital' }, 'user-1', user)

    expect(caja.saldoEsperado).toBe(50)
    const summary = (service as any).summarizeMovements(caja, [{ tipo: TipoMovimientoCaja.INGRESO, metodoPago: MetodoPago.YAPE, monto: 100, pagoId: 'pago-yape', metadata: {} }])
    expect(summary.totalDigital).toBe(100)
    expect(summary.esperadoEfectivo).toBe(50)
    expect(summary.totalCobrado).toBe(100)
  })

  it('rechaza montos no positivos y ajustes sin dirección', async () => {
    const caja: any = { id: 'caja-1', estado: EstadoCajaSesion.ABIERTA, saldoInicial: 100, saldoEsperado: 100, sedeId: 'sede-1', usuarioAperturaId: 'user-1' }
    const manager = managerFor(caja, { id: 'user-1', rol: RolUsuario.CAJERO, sedeId: 'sede-1' })
    await expect(service.registrarMovimiento('caja-1', { tipoMovimiento: TipoMovimientoCaja.INGRESO, monto: 0 }, 'user-1', user)).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.registrarMovimiento('caja-1', { tipoMovimiento: TipoMovimientoCaja.AJUSTE, monto: 5 }, 'user-1', user)).rejects.toThrow('dirección')
    expect(manager.save).not.toHaveBeenCalled()
  })

  it('cierra contra el ledger de la sesión y marca diferencia real', async () => {
    const caja: any = { id: 'caja-1', estado: EstadoCajaSesion.ABIERTA, saldoInicial: 50, saldoEsperado: 999, sedeId: 'sede-1', usuarioAperturaId: 'user-1' }
    const movimientos = [{ tipo: TipoMovimientoCaja.INGRESO, metodoPago: MetodoPago.YAPE, monto: 100, pagoId: 'pago-1', metadata: {} }]
    const manager = managerFor(caja, { id: 'user-1', rol: RolUsuario.CAJERO, sedeId: 'sede-1' }, movimientos)

    const result = await service.cerrarCaja('caja-1', { saldoDeclarado: 50 }, 'user-1', user)

    expect(result.diferencia).toBe(0)
    expect(caja.saldoEsperado).toBe(50)
    expect(caja.estado).toBe(EstadoCajaSesion.CERRADA)
    expect(manager.findOne).toHaveBeenCalledWith(CajaSesion, expect.objectContaining({ lock: { mode: 'pessimistic_write' } }))
  })

  it('filtra la caja diaria por Pago.sedeId y no por sede de recepción', async () => {
    pagoRepo.findAndCount.mockResolvedValue([[], 2])
    pagoRepo.find.mockResolvedValue([{ monto: 100, metodoPago: MetodoPago.EFECTIVO }])
    const result = await service.getDelDia({ fecha: '2026-08-24', page: 1, limit: 20 }, user)
    expect(pagoRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ sedeId: 'sede-1' }), take: 20 }))
    expect(result.total).toBe(100)
    await expect(service.getDelDia({ fecha: '2026-08-24', sedeId: 'sede-2' }, user)).rejects.toThrow('otra sede')
  })

  it('aísla una sesión de otro cajero en el resumen', async () => {
    const caja = { id: 'caja-a', sedeId: 'sede-1', estado: EstadoCajaSesion.ABIERTA, usuarioAperturaId: 'user-1', saldoInicial: 0 }
    cajaRepo.findOne.mockResolvedValue(caja)
    movimientoRepo.find.mockResolvedValue([{ cajaSesionId: 'caja-a', tipo: TipoMovimientoCaja.INGRESO, metodoPago: MetodoPago.EFECTIVO, monto: 100, pagoId: 'pago-a', metadata: {} }])
    const result = await service.sesionActual('user-1', user)
    expect(movimientoRepo.find).toHaveBeenCalledWith({ where: { cajaSesionId: 'caja-a' } })
    expect(result.resumen.totalCobrado).toBe(100)
    expect(result.resumen.esperadoEfectivo).toBe(100)
  })
})
