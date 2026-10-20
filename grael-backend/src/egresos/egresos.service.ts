import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Egreso, EstadoEgreso } from '../database/entities/egreso.entity'
import { CajaSesion, EstadoCajaSesion, MovimientoCaja, TipoMovimientoCaja } from '../database/entities/caja.entity'
import { Usuario, RolUsuario } from '../database/entities/usuario.entity'
import { Sede } from '../database/entities/sede.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertSedeAccess, isGlobalRole } from '../auth/sede-scope'

const APPROVER_ROLES = [RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN]

@Injectable()
export class EgresosService {
  constructor(
    @InjectRepository(Egreso) private readonly repo: Repository<Egreso>,
    @InjectRepository(CajaSesion) private readonly cajaRepo: Repository<CajaSesion>,
    @InjectRepository(MovimientoCaja) private readonly movimientoRepo: Repository<MovimientoCaja>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Sede) private readonly sedeRepo: Repository<Sede>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(query: any, user?: any) {
    const qb = this.repo.createQueryBuilder('e')
      .leftJoinAndSelect('e.sede', 'sede')
      .leftJoinAndSelect('e.usuarioSolicita', 'solicita')
      .leftJoinAndSelect('e.usuarioAutoriza', 'autoriza')
      .leftJoinAndSelect('e.cajaSesion', 'caja')
      .orderBy('e.fecha', 'DESC')
    if (!isGlobalRole(user) && user?.sedeId) qb.andWhere('e.sede_id = :sedeId', { sedeId: user.sedeId })
    if (query.sedeId) { assertSedeAccess(user, query.sedeId, 'consultar egresos'); qb.andWhere('e.sede_id = :requestedSedeId', { requestedSedeId: query.sedeId }) }
    if (query.estado) qb.andWhere('e.estado = :estado', { estado: query.estado })
    if (query.categoria) qb.andWhere('e.categoria = :categoria', { categoria: query.categoria })
    if (query.proveedor) qb.andWhere('e.proveedor ILIKE :proveedor', { proveedor: `%${query.proveedor}%` })
    if (query.fechaInicio) qb.andWhere('e.fecha >= :fechaInicio', { fechaInicio: new Date(`${query.fechaInicio}T00:00:00`) })
    if (query.fechaFin) qb.andWhere('e.fecha <= :fechaFin', { fechaFin: new Date(`${query.fechaFin}T23:59:59`) })
    return qb.getMany()
  }

  async crear(dto: any, usuarioId: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const usuario = await manager.findOneBy(Usuario, { id: usuarioId })
      if (!usuario) throw new NotFoundException('Usuario solicitante no encontrado')
      const sedeId = dto.sedeId || usuario.sedeId
      assertSedeAccess(user || usuario, sedeId, 'solicitar egresos')
      if (!sedeId) throw new BadRequestException({ statusCode: 400, code: 'SEDE_REQUIRED', message: 'El egreso requiere una sede', details: {} })
      const sede = await manager.findOneBy(Sede, { id: sedeId })
      if (!sede) throw new NotFoundException('Sede no encontrada')
      const monto = Number(dto.monto)
      if (!Number.isFinite(monto) || monto <= 0) throw new BadRequestException('El monto del egreso debe ser positivo')
      const egreso = manager.create(Egreso, {
        sede, sedeId, categoria: dto.categoria, concepto: dto.concepto, monto,
        proveedor: dto.proveedor, ruc: dto.ruc, documento: dto.documento, placa: dto.placa,
        chofer: dto.chofer, destino: dto.destino, observacion: dto.observacion,
        afectaCaja: dto.afectaCaja !== false, usuarioSolicita: usuario, usuarioSolicitaId: usuario.id,
        estado: EstadoEgreso.PENDIENTE,
      })
      const saved = await manager.save(Egreso, egreso)
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId, accion: 'SOLICITUD_EGRESO', entidad: 'Egreso', entidadId: saved.id, despues: { estado: saved.estado, monto: saved.monto, afectaCaja: saved.afectaCaja }, metadata: { concepto: saved.concepto } }))
      return saved
    })
  }

  async aprobar(id: string, dto: { cajaSesionId?: string }, usuarioId: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      // Orden de locks V10: Egreso primero, luego CajaSesion. Nunca se reintenta en bucle.
      const egreso = await manager.findOne(Egreso, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!egreso) throw new NotFoundException('Egreso no encontrado')
      const usuario = await manager.findOneBy(Usuario, { id: usuarioId })
      if (!usuario) throw new NotFoundException('Usuario autorizador no encontrado')
      assertSedeAccess(user || usuario, egreso.sedeId, 'aprobar egresos')
      if (!APPROVER_ROLES.includes(usuario.rol)) throw new ForbiddenException('El rol no puede aprobar egresos')
      if (egreso.usuarioSolicitaId === usuarioId) throw new ForbiddenException({ statusCode: 403, code: 'EXPENSE_SELF_APPROVAL', message: 'La política de egresos no permite autoaprobación', details: {} })
      if (egreso.estado !== EstadoEgreso.PENDIENTE) throw new BadRequestException({ statusCode: 409, code: 'EXPENSE_ALREADY_PROCESSED', message: 'El egreso ya fue procesado', details: { estado: egreso.estado } })

      let caja: CajaSesion | null = null
      if (egreso.afectaCaja !== false) {
        caja = dto?.cajaSesionId
          ? await manager.findOne(CajaSesion, { where: { id: dto.cajaSesionId }, lock: { mode: 'pessimistic_write' } })
          : await manager.findOne(CajaSesion, { where: { sedeId: egreso.sedeId, estado: EstadoCajaSesion.ABIERTA }, lock: { mode: 'pessimistic_write' } })
        if (!caja) throw new BadRequestException({ statusCode: 409, code: 'CASH_SESSION_REQUIRED', message: 'El egreso aprobado requiere una caja abierta de la misma sede', details: { sedeId: egreso.sedeId } })
        if (caja.estado !== EstadoCajaSesion.ABIERTA) throw new BadRequestException({ statusCode: 409, code: 'CASH_ALREADY_CLOSED', message: 'No se puede registrar un egreso en una caja cerrada u observada', details: { cajaSesionId: caja.id, estado: caja.estado } })
        if (caja.sedeId !== egreso.sedeId) throw new BadRequestException({ statusCode: 409, code: 'CASH_WRONG_SITE', message: 'La caja no pertenece a la sede del egreso', details: { cajaSedeId: caja.sedeId, egresoSedeId: egreso.sedeId } })
      }

      const antes = { estado: egreso.estado, cajaSesionId: egreso.cajaSesionId || null }
      egreso.estado = EstadoEgreso.APROBADO
      egreso.usuarioAutoriza = usuario
      egreso.usuarioAutorizaId = usuario.id
      egreso.cajaSesion = caja || undefined
      egreso.cajaSesionId = caja?.id
      const saved = await manager.save(Egreso, egreso)
      let movimiento: MovimientoCaja | null = null
      if (caja) {
        movimiento = await manager.save(MovimientoCaja, manager.create(MovimientoCaja, { cajaSesion: caja, cajaSesionId: caja.id, usuario, usuarioId, tipo: TipoMovimientoCaja.EGRESO, metodoPago: undefined, monto: egreso.monto, concepto: `Egreso ${egreso.concepto}`, metadata: { egresoId: egreso.id, operacion: 'EGRESO' } }))
        // Mantener el campo legado consistente; los resúmenes V10 recalculan desde MovimientoCaja.
        caja.saldoEsperado = Number((Number(caja.saldoEsperado || 0) - Number(egreso.monto)).toFixed(2))
        await manager.save(CajaSesion, caja)
      }
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId: egreso.sedeId, accion: 'APROBACION_EGRESO', entidad: 'Egreso', entidadId: egreso.id, antes, despues: { estado: saved.estado, monto: egreso.monto, cajaSesionId: caja?.id || null, movimientoId: movimiento?.id || null }, metadata: { solicitadoPor: egreso.usuarioSolicitaId } }))
      return saved
    })
  }

  async rechazar(id: string, motivo: string, usuarioId: string, user?: any) {
    if (!motivo?.trim()) throw new BadRequestException('El motivo de rechazo es obligatorio')
    return this.dataSource.transaction(async manager => {
      const egreso = await manager.findOne(Egreso, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!egreso) throw new NotFoundException('Egreso no encontrado')
      const usuario = await manager.findOneBy(Usuario, { id: usuarioId })
      if (!usuario) throw new NotFoundException('Usuario no encontrado')
      assertSedeAccess(user || usuario, egreso.sedeId, 'rechazar egresos')
      if (!APPROVER_ROLES.includes(usuario.rol)) throw new ForbiddenException('El rol no puede rechazar egresos')
      if (egreso.estado !== EstadoEgreso.PENDIENTE) throw new BadRequestException({ statusCode: 409, code: 'EXPENSE_ALREADY_PROCESSED', message: 'El egreso ya fue procesado', details: { estado: egreso.estado } })
      const antes = { estado: egreso.estado }
      egreso.estado = EstadoEgreso.RECHAZADO
      egreso.observacion = motivo
      egreso.usuarioAutoriza = usuario
      egreso.usuarioAutorizaId = usuarioId
      const saved = await manager.save(Egreso, egreso)
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId: egreso.sedeId, accion: 'RECHAZO_EGRESO', entidad: 'Egreso', entidadId: egreso.id, antes, despues: { estado: saved.estado }, metadata: { motivo } }))
      return saved
    })
  }

  async anular(id: string, motivo: string, usuarioId: string, user?: any) {
    if (!motivo?.trim()) throw new BadRequestException('El motivo de anulación es obligatorio')
    return this.dataSource.transaction(async manager => {
      const egreso = await manager.findOne(Egreso, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!egreso) throw new NotFoundException('Egreso no encontrado')
      const usuario = await manager.findOneBy(Usuario, { id: usuarioId })
      if (!usuario) throw new NotFoundException('Usuario no encontrado')
      assertSedeAccess(user || usuario, egreso.sedeId, 'anular egresos')
      if (!APPROVER_ROLES.includes(usuario.rol)) throw new ForbiddenException('El rol no puede anular egresos')
      if (![EstadoEgreso.PENDIENTE, EstadoEgreso.RECHAZADO].includes(egreso.estado)) throw new BadRequestException({ statusCode: 409, code: 'EXPENSE_ALREADY_PROCESSED', message: 'Un egreso aprobado con impacto de caja requiere reverso explícito; no se puede anular directamente', details: { estado: egreso.estado } })
      const antes = { estado: egreso.estado, observacion: egreso.observacion }
      egreso.estado = EstadoEgreso.ANULADO
      egreso.observacion = motivo
      egreso.usuarioAutoriza = usuario
      egreso.usuarioAutorizaId = usuarioId
      const saved = await manager.save(Egreso, egreso)
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId: egreso.sedeId, accion: 'ANULACION_EGRESO', entidad: 'Egreso', entidadId: egreso.id, antes, despues: { estado: saved.estado, observacion: motivo }, metadata: { motivo } }))
      return saved
    })
  }
}
