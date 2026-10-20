import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Incidencia, DisposicionIncidencia, EstadoIncidencia, TipoIncidencia } from '../database/entities/incidencia.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { Bulto, EstadoBulto } from '../database/entities/bulto.entity'
import { TrackingEvento, TipoTrackingEvento } from '../database/entities/tracking-evento.entity'
import { MovimientoAlmacen, TipoMovimientoAlmacen } from '../database/entities/movimiento-almacen.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertSedeAccess, effectiveSedeId } from '../auth/sede-scope'
import { assertTicketBultoIntegrity } from '../domain-integrity'

@Injectable()
export class IncidenciasService {
  constructor(
    @InjectRepository(Incidencia) private readonly repo: Repository<Incidencia>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Bulto) private readonly bultoRepo: Repository<Bulto>,
    @InjectRepository(TrackingEvento) private readonly trackingRepo: Repository<TrackingEvento>,
    @InjectRepository(MovimientoAlmacen) private readonly movimientoAlmacenRepo: Repository<MovimientoAlmacen>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(query: any, user?: any) {
    const qb = this.repo.createQueryBuilder('i')
      .leftJoinAndSelect('i.ticket', 'ticket')
      .leftJoinAndSelect('i.bulto', 'bulto')
      .leftJoinAndSelect('i.sede', 'sede')
      .leftJoinAndSelect('i.almacen', 'almacen')
      .leftJoin('bulto.sedeActual', 'custodySede')
      .orderBy('i.createdAt', 'DESC')
    const scopeSedeId = effectiveSedeId(user, query.sedeId)
    if (query.sedeId && scopeSedeId !== query.sedeId) assertSedeAccess(user, query.sedeId, 'consultar incidencias')
    if (scopeSedeId) qb.andWhere('(i.sede_id = :scopeSedeId OR (i.sede_id IS NULL AND bulto.sede_actual_id = :scopeSedeId))', { scopeSedeId })
    if (query.ticketId) qb.andWhere('i.ticket_id = :ticketId', { ticketId: query.ticketId })
    if (query.bultoId) qb.andWhere('i.bulto_id = :bultoId', { bultoId: query.bultoId })
    if (query.estado) qb.andWhere('i.estado = :estado', { estado: query.estado })
    if (query.tipo) qb.andWhere('i.tipo_incidencia = :tipo', { tipo: query.tipo })
    return qb.getMany()
  }

  async crear(dto: any, usuarioId?: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const ticket = await manager.findOne(Ticket, { where: { id: dto.ticketId }, relations: ['bultos', 'destino'] })
      if (!ticket) throw new NotFoundException('Ticket no encontrado')
      const bulto = dto.bultoId ? await manager.findOne(Bulto, { where: { id: dto.bultoId }, lock: { mode: 'pessimistic_write' } }) : null
      if (dto.bultoId) assertTicketBultoIntegrity(ticket.id, bulto)
      const activeBultos = (ticket.bultos || []).filter(item => item.estado !== EstadoBulto.ANULADO)
      const relevantBultos = bulto ? [bulto] : activeBultos
      const custodySites = [...new Set(relevantBultos.map(item => item.sedeActualId).filter(Boolean))]
      const sedeId = custodySites.length === 1 ? custodySites[0] : (custodySites.length === 0 ? ticket.destino?.sedeId : undefined)
      if (!sedeId) throw new BadRequestException({ statusCode: 409, code: 'INCIDENT_CUSTODY_SITE_REQUIRED', message: 'La incidencia requiere una sede de custodia determinable', details: { custodySites } })
      assertSedeAccess(user, sedeId, 'crear incidencias')
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      const incidencia = await manager.save(Incidencia, manager.create(Incidencia, { ticketId: ticket.id, bultoId: bulto?.id, tipo: dto.tipo, descripcion: dto.descripcion, evidencia: dto.evidencia, sedeId, usuarioId: usuario?.id, usuario }))
      if (bulto) {
        const nextState = dto.tipo === TipoIncidencia.FALTANTE ? EstadoBulto.FALTANTE : EstadoBulto.OBSERVADO
        if (![EstadoBulto.ENTREGADO, EstadoBulto.ANULADO].includes(bulto.estado)) {
          bulto.estado = nextState
          await manager.save(Bulto, bulto)
          await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: ticket.id, bultoId: bulto.id, sedeId, tipoEvento: TipoTrackingEvento.OBSERVADO, usuarioId: usuario?.id, observacion: dto.descripcion, metadata: { incidenciaId: incidencia.id, tipo: dto.tipo, sedeId } }))
        }
      }
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId, accion: 'INCIDENT_CREATED', entidad: 'Incidencia', entidadId: incidencia.id, despues: { tipo: incidencia.tipo, ticketId: incidencia.ticketId, bultoId: incidencia.bultoId, estado: incidencia.estado }, metadata: { requestId: user?.requestId || null } }))
      return incidencia
    })
  }

  async resolver(id: string, dto: { estado: EstadoIncidencia; disposicion: DisposicionIncidencia; resolucion?: string }, usuarioId?: string, user?: any) {
    if (![EstadoIncidencia.RESUELTA, EstadoIncidencia.CERRADA].includes(dto.estado)) throw new BadRequestException({ statusCode: 400, code: 'INCIDENT_INVALID_RESOLUTION', message: 'La resolución debe cerrar la incidencia en RESUELTA o CERRADA', details: { estado: dto.estado } })
    if (!Object.values(DisposicionIncidencia).includes(dto.disposicion)) throw new BadRequestException({ statusCode: 400, code: 'INCIDENT_INVALID_RESOLUTION', message: 'La disposición física no es válida', details: { disposicion: dto.disposicion } })
    if (!user || !['ADMIN_SEDE', 'SUPERVISOR', 'SUPERADMIN'].includes(String(user.rol))) throw new ForbiddenException({ statusCode: 403, code: 'INCIDENT_RESOLUTION_FORBIDDEN', message: 'AUDITOR y perfiles operativos solo tienen lectura de incidencias', details: {} })
    return this.dataSource.transaction(async manager => {
      const incidencia = await manager.findOne(Incidencia, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!incidencia) throw new NotFoundException('Incidencia no encontrada')
      if ([EstadoIncidencia.RESUELTA, EstadoIncidencia.CERRADA].includes(incidencia.estado)) throw new BadRequestException({ statusCode: 409, code: 'INCIDENT_ALREADY_RESOLVED', message: 'La incidencia ya fue resuelta', details: { estado: incidencia.estado, disposicion: incidencia.disposicion } })
      const incidenciaBulto = incidencia.bultoId ? await manager.findOne(Bulto, { where: { id: incidencia.bultoId }, lock: { mode: 'pessimistic_write' } }) : null
      const sedeId = incidencia.sedeId || incidenciaBulto?.sedeActualId
      assertSedeAccess(user, sedeId, 'resolver incidencias')
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      const antes = { estado: incidencia.estado, resolucion: incidencia.resolucion, disposicion: incidencia.disposicion, bultoEstado: incidenciaBulto?.estado }
      if (incidenciaBulto) assertTicketBultoIntegrity(incidencia.ticketId, incidenciaBulto)
      let nextState: EstadoBulto | undefined
      let trackingType: TipoTrackingEvento | undefined
      let movementType: TipoMovimientoAlmacen | undefined
      switch (dto.disposicion) {
        case DisposicionIncidencia.ENCONTRADO:
          nextState = EstadoBulto.EN_ALMACEN; trackingType = TipoTrackingEvento.INGRESO_ALMACEN; movementType = TipoMovimientoAlmacen.INGRESO; break
        case DisposicionIncidencia.REINGRESADO_ALMACEN:
          nextState = EstadoBulto.EN_ALMACEN; trackingType = TipoTrackingEvento.INGRESO_ALMACEN; movementType = TipoMovimientoAlmacen.INGRESO; break
        case DisposicionIncidencia.ACEPTADO_CON_DANO:
          nextState = EstadoBulto.OBSERVADO; trackingType = TipoTrackingEvento.OBSERVADO; break
        case DisposicionIncidencia.DEVUELTO_ORIGEN:
          nextState = EstadoBulto.DEVUELTO; trackingType = TipoTrackingEvento.DEVUELTO; break
        case DisposicionIncidencia.ENTREGADO:
          nextState = EstadoBulto.ENTREGADO; trackingType = TipoTrackingEvento.ENTREGADO; break
        case DisposicionIncidencia.SIN_CAMBIO_FISICO:
          break
      }
      if (incidenciaBulto && nextState) {
        if (incidenciaBulto.estado === EstadoBulto.ENTREGADO && nextState !== EstadoBulto.ENTREGADO) throw new BadRequestException({ statusCode: 409, code: 'INCIDENT_INVALID_RESOLUTION', message: 'No se puede retroceder un bulto ya entregado', details: { estado: incidenciaBulto.estado, disposicion: dto.disposicion } })
        incidenciaBulto.estado = nextState
        await manager.save(Bulto, incidenciaBulto)
        if (trackingType) await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: incidencia.ticketId, bultoId: incidenciaBulto.id, sedeId, tipoEvento: trackingType, usuarioId, observacion: dto.resolucion || `Disposición: ${dto.disposicion}`, metadata: { incidenciaId: incidencia.id, disposicion: dto.disposicion } }))
        if (movementType) await manager.save(MovimientoAlmacen, manager.create(MovimientoAlmacen, { bultoId: incidenciaBulto.id, sedeId, tipo: movementType, referenciaTipo: 'Incidencia', referenciaId: incidencia.id, motivo: dto.resolucion || `Disposición: ${dto.disposicion}`, usuarioId }))
      }
      incidencia.estado = dto.estado
      incidencia.resolucion = dto.resolucion || incidencia.resolucion || `Disposición: ${dto.disposicion}`
      incidencia.disposicion = dto.disposicion
      incidencia.resueltoPor = usuario || undefined
      incidencia.resueltoPorId = usuario?.id
      const saved = await manager.save(Incidencia, incidencia)
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId, accion: 'INCIDENT_RESOLVED', entidad: 'Incidencia', entidadId: incidencia.id, antes, despues: { estado: saved.estado, resolucion: saved.resolucion, disposicion: saved.disposicion, bultoEstado: incidenciaBulto?.estado }, metadata: { requestId: user?.requestId || null } }))
      return saved
    })
  }
}
