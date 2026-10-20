import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import { Entrega, EstadoEntrega } from '../database/entities/entrega.entity'
import { Ticket, EstadoTicket } from '../database/entities/ticket.entity'
import { Bulto, EstadoBulto } from '../database/entities/bulto.entity'
import { TrackingEvento, TipoTrackingEvento } from '../database/entities/tracking-evento.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertSedeAccess, effectiveSedeId } from '../auth/sede-scope'
import { assertTicketBultoIntegrity } from '../domain-integrity'

const ACTIVE_DELIVERY_STATES = [EstadoEntrega.PROGRAMADA, EstadoEntrega.EN_REPARTO]

@Injectable()
export class EntregasService {
  constructor(
    @InjectRepository(Entrega) private readonly repo: Repository<Entrega>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Bulto) private readonly bultoRepo: Repository<Bulto>,
    @InjectRepository(TrackingEvento) private readonly trackingRepo: Repository<TrackingEvento>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(query: any, user?: any) {
    const qb = this.repo.createQueryBuilder('e')
      .leftJoinAndSelect('e.ticket', 'ticket')
      .leftJoinAndSelect('e.bulto', 'bulto')
      .leftJoin('bulto.sedeActual', 'custodySede')
      .orderBy('e.createdAt', 'DESC')
    const scopeSedeId = effectiveSedeId(user, query.sedeId)
    if (query.sedeId && scopeSedeId !== query.sedeId) assertSedeAccess(user, query.sedeId, 'consultar entregas')
    if (scopeSedeId) qb.andWhere('(e.sede_id = :scopeSedeId OR (e.sede_id IS NULL AND bulto.sede_actual_id = :scopeSedeId))', { scopeSedeId })
    if (query.ticketId) qb.andWhere('e.ticket_id = :ticketId', { ticketId: query.ticketId })
    if (query.bultoId) qb.andWhere('e.bulto_id = :bultoId', { bultoId: query.bultoId })
    if (query.estado) qb.andWhere('e.estado = :estado', { estado: query.estado })
    return qb.getMany()
  }

  async crear(dto: any, usuarioId?: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const ticket = await manager.findOne(Ticket, { where: { id: dto.ticketId }, relations: ['bultos', 'destino'] })
      if (!ticket) throw new NotFoundException('Ticket no encontrado')
      const activeBultos = (ticket.bultos || []).filter(bulto => bulto.estado !== EstadoBulto.ANULADO)
      if (activeBultos.length === 0) throw new BadRequestException({ statusCode: 409, code: 'DELIVERY_BULTO_REQUIRED', message: 'La entrega moderna requiere al menos un bulto activo', details: { ticketId: ticket.id } })
      const requestedIds = dto.bultoId ? [dto.bultoId] : activeBultos.map(item => item.id)
      const lockedBultos: Bulto[] = []
      for (const bultoId of requestedIds) {
        const locked = await manager.findOne(Bulto, { where: { id: bultoId }, lock: { mode: 'pessimistic_write' } })
        if (!locked) throw new NotFoundException(`Bulto ${bultoId} no encontrado`)
        assertTicketBultoIntegrity(ticket.id, locked)
        if (locked.estado === EstadoBulto.ANULADO) throw new BadRequestException({ statusCode: 409, code: 'DELIVERY_BULTO_REQUIRED', message: 'El bulto está anulado', details: { bultoId } })
        if ([EstadoBulto.ENTREGADO, EstadoBulto.DEVUELTO].includes(locked.estado)) throw new ConflictException({ code: 'DELIVERY_ALREADY_CLOSED', message: 'El bulto ya tiene una disposición final de entrega', details: { bultoId, estado: locked.estado } })
        lockedBultos.push(locked)
      }
      const custodySites = [...new Set(lockedBultos.map(item => item.sedeActualId).filter(Boolean))]
      if (custodySites.length !== 1) throw new BadRequestException({ statusCode: 409, code: 'DELIVERY_CUSTODY_SITE_REQUIRED', message: 'Todos los bultos entregados deben estar en una única sede de custodia', details: { custodySites } })
      const sedeId = custodySites[0]
      assertSedeAccess(user, sedeId, 'crear entregas')
      const existing = await manager.findOne(Entrega, { where: dto.bultoId ? { bultoId: dto.bultoId, estado: In(ACTIVE_DELIVERY_STATES) } : { ticketId: ticket.id, estado: In(ACTIVE_DELIVERY_STATES) } })
      if (existing) throw new ConflictException({ code: 'DELIVERY_ALREADY_ACTIVE', message: 'Ya existe una entrega activa para la carga seleccionada', details: { entregaId: existing.id } })
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      const saved = await manager.save(Entrega, manager.create(Entrega, { ticketId: ticket.id, bultoId: dto.bultoId, tipo: dto.tipo, fechaProgramada: dto.fechaProgramada ? new Date(dto.fechaProgramada) : undefined, observacion: dto.observacion, sedeId, usuarioId: usuario?.id, usuario }))
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId, accion: 'DELIVERY_CREATED', entidad: 'Entrega', entidadId: saved.id, despues: { ticketId: ticket.id, bultoIds: lockedBultos.map(item => item.id), estado: saved.estado }, metadata: { requestId: user?.requestId || null } }))
      return saved
    })
  }

  async entregar(id: string, dto: any, usuarioId?: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const entrega = await manager.findOne(Entrega, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!entrega) throw new NotFoundException('Entrega no encontrada')
      if (![EstadoEntrega.PROGRAMADA, EstadoEntrega.EN_REPARTO].includes(entrega.estado)) throw new BadRequestException({ statusCode: 409, code: entrega.estado === EstadoEntrega.ENTREGADA ? 'DELIVERY_ALREADY_CONFIRMED' : 'INVALID_STATE_TRANSITION', message: 'La entrega no admite confirmación desde su estado actual', details: { estado: entrega.estado } })
      const deliveryBulto = entrega.bultoId ? await manager.findOneByOrFail(Bulto, { id: entrega.bultoId }) : null
      const deliveryTicket = await manager.findOne(Ticket, { where: { id: entrega.ticketId }, relations: ['bultos'] })
      const activeBultos = deliveryBulto ? [deliveryBulto] : (deliveryTicket?.bultos || []).filter(item => item.estado !== EstadoBulto.ANULADO)
      if (activeBultos.length === 0) throw new BadRequestException({ statusCode: 409, code: 'DELIVERY_BULTO_REQUIRED', message: 'No hay bultos activos entregables', details: { ticketId: entrega.ticketId } })
      const custodySites = [...new Set(activeBultos.map(item => item.sedeActualId).filter(Boolean))]
      if (custodySites.length !== 1) throw new BadRequestException({ statusCode: 409, code: 'DELIVERY_CUSTODY_SITE_REQUIRED', message: 'La entrega requiere custodia única', details: { custodySites } })
      assertSedeAccess(user, custodySites[0], 'confirmar entregas')
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      entrega.estado = EstadoEntrega.ENTREGADA
      entrega.fechaEntrega = new Date()
      entrega.nombreReceptor = dto.nombreReceptor
      entrega.documentoReceptor = dto.documentoReceptor
      entrega.observacion = dto.observacion
      entrega.evidencia = dto.evidencia
      entrega.latitud = dto.latitud
      entrega.longitud = dto.longitud
      entrega.firma = dto.firma
      entrega.usuario = usuario || undefined
      entrega.usuarioId = usuario?.id
      entrega.sedeId = custodySites[0]
      await manager.save(Entrega, entrega)
      for (const bulto of activeBultos) {
        assertTicketBultoIntegrity(entrega.ticketId, bulto)
        bulto.estado = EstadoBulto.ENTREGADO
        await manager.save(Bulto, bulto)
        await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: entrega.ticketId, bultoId: bulto.id, sedeId: custodySites[0], tipoEvento: TipoTrackingEvento.ENTREGADO, usuarioId: usuario?.id, observacion: 'Entrega confirmada', metadata: { entregaId: entrega.id } }))
      }
      const ticket = await manager.findOne(Ticket, { where: { id: entrega.ticketId }, relations: ['bultos'] })
      if (ticket && (ticket.bultos || []).filter(item => item.estado !== EstadoBulto.ANULADO).length > 0 && (ticket.bultos || []).filter(item => item.estado !== EstadoBulto.ANULADO).every(item => item.estado === EstadoBulto.ENTREGADO)) { ticket.estado = EstadoTicket.ENTREGADO; await manager.save(Ticket, ticket) }
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId: custodySites[0], accion: 'DELIVERY_CONFIRMED', entidad: 'Entrega', entidadId: entrega.id, despues: { ticketId: entrega.ticketId, bultoIds: activeBultos.map(item => item.id), nombreReceptor: entrega.nombreReceptor, documentoReceptor: entrega.documentoReceptor }, metadata: { requestId: user?.requestId || null } }))
      return entrega
    })
  }

  async intentoFallido(id: string, dto: any, usuarioId?: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const entrega = await manager.findOne(Entrega, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!entrega) throw new NotFoundException('Entrega no encontrada')
      if (![EstadoEntrega.PROGRAMADA, EstadoEntrega.EN_REPARTO].includes(entrega.estado)) throw new BadRequestException({ statusCode: 409, code: 'INVALID_STATE_TRANSITION', message: 'Solo se puede registrar un intento desde PROGRAMADA o EN_REPARTO', details: { estado: entrega.estado } })
      const bulto = entrega.bultoId ? await manager.findOneBy(Bulto, { id: entrega.bultoId }) : null
      const sedeId = entrega.sedeId || bulto?.sedeActualId
      assertSedeAccess(user, sedeId, 'registrar intentos de entrega')
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      entrega.estado = EstadoEntrega.INTENTO_FALLIDO
      entrega.observacion = dto.observacion || dto.motivo || 'Intento de entrega fallido'
      entrega.usuarioId = usuario?.id || usuarioId
      entrega.usuario = usuario || undefined
      const saved = await manager.save(Entrega, entrega)
      if (bulto) await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: entrega.ticketId, bultoId: bulto.id, sedeId, tipoEvento: TipoTrackingEvento.INTENTO_ENTREGA, usuarioId, observacion: entrega.observacion, metadata: { entregaId: entrega.id, motivo: dto.motivo || null } }))
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId, accion: 'DELIVERY_FAILED_ATTEMPT', entidad: 'Entrega', entidadId: id, despues: { estado: saved.estado, motivo: entrega.observacion }, metadata: { requestId: user?.requestId || null } }))
      return saved
    })
  }
}
