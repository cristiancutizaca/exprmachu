import { sumMoney } from '../common/decimal'
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Raw, Repository } from 'typeorm'
import { MetodoPago, Pago } from '../database/entities/operaciones.entity'
import { CajaSesion, EstadoCajaSesion, MovimientoCaja, TipoMovimientoCaja } from '../database/entities/caja.entity'
import { Sede } from '../database/entities/sede.entity'
import { RolUsuario, Usuario } from '../database/entities/usuario.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertSedeAccess, isGlobalRole } from '../auth/sede-scope'
import { fechaLocalPeru, hoyPeru, limiteEnZonaDb, limitesDiaPeru } from '../common/peru-time'

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago) private readonly repo: Repository<Pago>,
    @InjectRepository(CajaSesion) private readonly cajaRepo: Repository<CajaSesion>,
    @InjectRepository(MovimientoCaja) private readonly movimientoRepo: Repository<MovimientoCaja>,
    @InjectRepository(Sede) private readonly sedeRepo: Repository<Sede>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  private safeUser(usuario?: Usuario | null) {
    if (!usuario) return usuario
    const { password: _password, ...safe } = usuario as any
    return safe
  }

  private safeCaja(caja: any) {
    if (!caja) return caja
    return { ...caja, usuarioApertura: this.safeUser(caja.usuarioApertura), usuarioCierre: this.safeUser(caja.usuarioCierre) }
  }

  private signedMovement(movement: Pick<MovimientoCaja, 'tipo' | 'metadata' | 'monto'>) {
    const direction = String((movement.metadata as any)?.direccion || (movement.metadata as any)?.operacion || (movement.metadata as any)?.operation || '').toUpperCase()
    const isDecrease = movement.tipo === TipoMovimientoCaja.EGRESO || ['SALIDA', 'DISMINUCION', 'AJUSTE_DISMINUCION', 'RETIRO', 'DEPOSITO'].includes(direction)
    return isDecrease ? -Number(movement.monto || 0) : Number(movement.monto || 0)
  }

  private expectedCash(saldoInicial: number, movimientos: MovimientoCaja[]) {
    return sumMoney([saldoInicial, ...movimientos.filter(m => this.isPhysicalMovement(m)).map(m => this.signedMovement(m))])
  }

  private isPhysicalMovement(movement: Pick<MovimientoCaja, 'metodoPago' | 'metadata'>) {
    const method = movement.metodoPago
    if (!method) return true
    return method === MetodoPago.EFECTIVO
  }

  private summarizeMovements(caja: CajaSesion, movimientos: MovimientoCaja[]) {
    const ingresos = movimientos.filter(m => m.tipo === TipoMovimientoCaja.INGRESO)
    const egresos = movimientos.filter(m => m.tipo === TipoMovimientoCaja.EGRESO)
    const porMetodo = ingresos.reduce((acc, movement) => {
      const key = movement.metodoPago || 'OTROS'
      acc[key] = sumMoney([acc[key] ?? 0, movement.monto])
      return acc
    }, {} as Record<string, number>)
    const cashIn = sumMoney(ingresos.filter(m => this.isPhysicalMovement(m)).map(m => m.monto))
    const cashOut = sumMoney(egresos.filter(m => this.isPhysicalMovement(m)).map(m => m.monto))
    const operation = (m: MovimientoCaja) => String((m.metadata as any)?.operacion || (m.metadata as any)?.operation || '').toUpperCase()
    const depositos = sumMoney(egresos.filter(m => operation(m) === 'DEPOSITO').map(m => m.monto))
    const retiros = sumMoney(egresos.filter(m => operation(m) === 'RETIRO').map(m => m.monto))
    const adjustments = sumMoney(movimientos.filter(m => m.tipo === TipoMovimientoCaja.AJUSTE).map(m => this.signedMovement(m)))
    const paymentMovements = ingresos.filter(m => Boolean(m.pagoId))
    const totalCobrado = sumMoney(paymentMovements.map(m => m.monto))
    const totalDigital = sumMoney(ingresos.filter(m => !this.isPhysicalMovement(m)).map(m => m.monto))
    const totalIngresos = sumMoney(ingresos.map(m => m.monto))
    const totalEgresos = sumMoney(egresos.map(m => m.monto))
    const esperadoEfectivo = this.expectedCash(Number(caja.saldoInicial || 0), movimientos)
    return {
      saldoInicial: Number(caja.saldoInicial || 0),
      efectivo: Number((porMetodo[MetodoPago.EFECTIVO] || 0).toFixed(2)),
      yape: Number((porMetodo[MetodoPago.YAPE] || 0).toFixed(2)),
      plin: Number((porMetodo[MetodoPago.PLIN] || 0).toFixed(2)),
      transferencia: Number((porMetodo[MetodoPago.TRANSFERENCIA] || 0).toFixed(2)),
      tarjeta: Number((porMetodo[MetodoPago.TARJETA] || 0).toFixed(2)),
      otros: Number((porMetodo.OTROS || 0).toFixed(2)),
      totalCobrado: Number(totalCobrado.toFixed(2)),
      totalDigital: Number(totalDigital.toFixed(2)),
      ingresosEfectivo: Number(cashIn.toFixed(2)),
      egresosEfectivo: Number(cashOut.toFixed(2)),
      depositos: Number(depositos.toFixed(2)),
      retiros: Number(retiros.toFixed(2)),
      ajustes: Number(adjustments.toFixed(2)),
      totalIngresos: Number(totalIngresos.toFixed(2)),
      totalEgresos: Number(totalEgresos.toFixed(2)),
      esperadoEfectivo,
    }
  }

  async getDelDia(query: { fecha?: string; sedeId?: string; page?: number; limit?: number } = {}, user?: any) {
    const fecha = query.fecha || hoyPeru()
    const { inicio: dia, fin } = limitesDiaPeru(fecha)
    if (query.sedeId && !isGlobalRole(user)) assertSedeAccess(user, query.sedeId, 'consultar caja diaria')
    const scopeSedeId = isGlobalRole(user) ? (query.sedeId || undefined) : user?.sedeId
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))
    const where: any = { createdAt: Raw(column => `${column} >= ${limiteEnZonaDb(':desde')} AND ${column} < ${limiteEnZonaDb(':hasta')}`, {
      desde: dia.toISOString(), hasta: new Date(fin.getTime() + 1).toISOString(),
    }) }
    if (scopeSedeId) where.sedeId = scopeSedeId
    const [pagos, totalRegistros] = await this.repo.findAndCount({ where, relations: ['ticket', 'ticket.origen', 'ticket.destino', 'ticket.remitente', 'ticket.destinatario', 'usuario'], order: { createdAt: 'ASC', id: 'ASC' }, skip: (page - 1) * limit, take: limit })
    const franja = `(floor(extract(hour FROM ${fechaLocalPeru('p.created_at')}) / 2)::int * 2)`
    const groups: { metodo: string; monto: string; cantidad: number; hora: number }[] = await this.repo.createQueryBuilder('p')
      .select('p.metodo_pago', 'metodo').addSelect('SUM(p.monto)', 'monto').addSelect('COUNT(*)::int', 'cantidad')
      .addSelect(franja, 'hora').where(where).groupBy('p.metodo_pago').addGroupBy(franja).getRawMany()
    const porMetodo: Record<string, number> = {}, cantidadPorMetodo: Record<string, number> = {}, porHora: Record<number, number> = {}
    for (const row of groups) {
      porMetodo[row.metodo] = sumMoney([porMetodo[row.metodo] ?? 0, row.monto])
      cantidadPorMetodo[row.metodo] = (cantidadPorMetodo[row.metodo] ?? 0) + row.cantidad
      porHora[row.hora] = sumMoney([porHora[row.hora] ?? 0, row.monto])
    }
    return { pagos: pagos.map(payment => ({ ...payment, usuario: this.safeUser(payment.usuario) })),
      total: sumMoney(groups.map(row => row.monto)), porMetodo, cantidadPorMetodo, porHora, fecha,
      cantidadCobros: totalRegistros, page, limit, totalPages: Math.ceil(totalRegistros / limit), sedeId: scopeSedeId || null }
  }

  async abrirCaja(dto: { sedeId: string; saldoInicial?: number; observacion?: string }, usuarioId: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`grael:caja:abrir:${usuarioId}`])
      const usuario = await manager.findOneBy(Usuario, { id: usuarioId })
      if (!usuario) throw new NotFoundException('Usuario no encontrado')
      const sede = await manager.findOneBy(Sede, { id: dto.sedeId })
      if (!sede) throw new NotFoundException('Sede no encontrada')
      assertSedeAccess(user || usuario, dto.sedeId, 'abrir una caja')
      const open = await manager.findOneBy(CajaSesion, { usuarioAperturaId: usuarioId, estado: EstadoCajaSesion.ABIERTA })
      if (open) throw new BadRequestException({ statusCode: 409, code: 'CASH_ALREADY_OPEN', message: 'El usuario ya tiene una caja abierta', details: { cajaSesionId: open.id } })
      const saldoInicial = Number(dto.saldoInicial || 0)
      if (!Number.isFinite(saldoInicial) || saldoInicial < 0) throw new BadRequestException('El saldo inicial debe ser un número no negativo')
      const saved = await manager.save(CajaSesion, manager.create(CajaSesion, { sede, sedeId: sede.id, usuarioApertura: usuario, usuarioAperturaId: usuario.id, saldoInicial, saldoEsperado: saldoInicial, estado: EstadoCajaSesion.ABIERTA, observacion: dto.observacion }))
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId: sede.id, accion: 'CAJA_ABIERTA', entidad: 'CajaSesion', entidadId: saved.id, despues: { saldoInicial, estado: saved.estado }, metadata: { observacion: dto.observacion || null } }))
      const full = await manager.findOne(CajaSesion, { where: { id: saved.id }, relations: ['sede', 'usuarioApertura', 'usuarioCierre'] })
      return this.safeCaja(full)
    })
  }

  async sesionActual(usuarioId: string, user?: any) {
    const caja = await this.cajaRepo.findOne({ where: { usuarioAperturaId: usuarioId, estado: EstadoCajaSesion.ABIERTA }, relations: ['sede', 'usuarioApertura', 'usuarioCierre'] })
    if (!caja) return null
    assertSedeAccess(user, caja.sedeId, 'consultar la caja')
    const movimientos = await this.movimientoRepo.find({ where: { cajaSesionId: caja.id } })
    const resumen = this.summarizeMovements(caja, movimientos)
    return { ...this.safeCaja(caja), saldoEsperado: resumen.esperadoEfectivo, resumen }
  }

  async registrarMovimiento(id: string, dto: any, usuarioId: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const caja = await manager.findOne(CajaSesion, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!caja) throw new NotFoundException('Caja no encontrada')
      const usuario = await manager.findOneBy(Usuario, { id: usuarioId })
      if (!usuario) throw new NotFoundException('Usuario no encontrado')
      const actingUser = user || usuario
      assertSedeAccess(actingUser, caja.sedeId, 'operar una caja')
      const type = dto.tipoMovimiento as TipoMovimientoCaja
      if (!Object.values(TipoMovimientoCaja).includes(type)) throw new BadRequestException('Tipo de movimiento inválido')
      const intervention = caja.usuarioAperturaId !== usuarioId
      const authorizedIntervention = isGlobalRole(actingUser) || actingUser.rol === RolUsuario.ADMIN_SEDE
      if (intervention && !authorizedIntervention) throw new ForbiddenException({ statusCode: 403, code: 'CASH_OWNER_FORBIDDEN', message: 'Solo el responsable de caja o un supervisor/admin autorizado puede intervenir', details: { cajaId: id } })
      if (caja.estado !== EstadoCajaSesion.ABIERTA && !(type === TipoMovimientoCaja.AJUSTE && authorizedIntervention)) throw new BadRequestException({ statusCode: 409, code: 'CASH_SESSION_CLOSED', message: 'La caja cerrada u observada solo admite ajustes autorizados', details: { estado: caja.estado } })
      const amount = Number(dto.monto)
      if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('El monto debe ser positivo')
      if (type === TipoMovimientoCaja.AJUSTE && !dto.metadata?.direccion && !dto.metadata?.operacion && !dto.metadata?.operation) throw new BadRequestException({ statusCode: 400, code: 'CASH_ADJUSTMENT_DIRECTION_REQUIRED', message: 'El ajuste requiere dirección ENTRADA o SALIDA', details: {} })
      const saved = await manager.save(MovimientoCaja, manager.create(MovimientoCaja, { cajaSesion: caja, cajaSesionId: caja.id, usuario, usuarioId, tipo: type, metodoPago: dto.metodoPago, monto: amount, concepto: dto.concepto, pagoId: dto.pagoId, metadata: { ...(dto.metadata || {}), intervention, adjustment: type === TipoMovimientoCaja.AJUSTE } }))
      const movimientos = typeof manager.find === 'function' ? await manager.find(MovimientoCaja, { where: { cajaSesionId: caja.id } }) : [saved]
      caja.saldoEsperado = this.expectedCash(Number(caja.saldoInicial || 0), movimientos)
      await manager.save(CajaSesion, caja)
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId: caja.sedeId, accion: type === TipoMovimientoCaja.AJUSTE ? 'CAJA_AJUSTE' : 'CAJA_MOVIMIENTO', entidad: 'MovimientoCaja', entidadId: saved.id, despues: { cajaSesionId: caja.id, tipo: type, monto: amount, saldoEsperado: caja.saldoEsperado }, metadata: { intervention, pagoId: dto.pagoId || null } }))
      return { ...saved, usuario: this.safeUser(saved.usuario) }
    })
  }

  async cerrarCaja(id: string, dto: { saldoDeclarado: number; observacion?: string }, usuarioId: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const caja = await manager.findOne(CajaSesion, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!caja) throw new NotFoundException('Caja no encontrada')
      const usuario = await manager.findOneBy(Usuario, { id: usuarioId })
      if (!usuario) throw new NotFoundException('Usuario no encontrado')
      const actingUser = user || usuario
      assertSedeAccess(actingUser, caja.sedeId, 'cerrar una caja')
      const intervention = caja.usuarioAperturaId !== usuarioId
      const authorizedIntervention = isGlobalRole(actingUser) || actingUser.rol === RolUsuario.ADMIN_SEDE
      if (intervention && !authorizedIntervention) throw new ForbiddenException({ statusCode: 403, code: 'CASH_OWNER_FORBIDDEN', message: 'Solo el responsable de caja o un supervisor/admin autorizado puede cerrar', details: { cajaId: id } })
      if (caja.estado !== EstadoCajaSesion.ABIERTA) throw new BadRequestException({ statusCode: 409, code: 'CASH_ALREADY_CLOSED', message: 'La caja ya está cerrada', details: { estado: caja.estado } })
      const declared = Number(dto.saldoDeclarado)
      if (!Number.isFinite(declared) || declared < 0) throw new BadRequestException('Saldo declarado inválido')
      const movimientos = typeof manager.find === 'function' ? await manager.find(MovimientoCaja, { where: { cajaSesionId: caja.id } }) : []
      const expected = this.expectedCash(Number(caja.saldoInicial || 0), movimientos)
      const difference = sumMoney([declared, -expected])
      caja.saldoEsperado = expected
      caja.saldoDeclarado = declared
      caja.fechaCierre = new Date()
      caja.usuarioCierreId = usuarioId
      caja.observacion = dto.observacion || (difference === 0 ? 'Cierre cuadrado' : `Diferencia de caja: ${difference.toFixed(2)}`)
      caja.estado = difference === 0 ? EstadoCajaSesion.CERRADA : EstadoCajaSesion.OBSERVADA
      const saved = await manager.save(CajaSesion, caja)
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId: caja.sedeId, accion: difference === 0 ? 'CAJA_CERRADA' : 'CAJA_OBSERVADA', entidad: 'CajaSesion', entidadId: caja.id, despues: { esperado: expected, declarado: declared, diferencia: difference, estado: saved.estado }, metadata: { intervention, observacion: caja.observacion } }))
      return { caja: this.safeCaja(saved), diferencia: difference }
    })
  }
}
