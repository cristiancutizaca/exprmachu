import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { TrackingEvento, TipoTrackingEvento } from '../database/entities/tracking-evento.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { Bulto } from '../database/entities/bulto.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { Sede } from '../database/entities/sede.entity'
import { Almacen, UbicacionAlmacen } from '../database/entities/almacen.entity'
import { Manifiesto } from '../database/entities/operaciones.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertSedeAccess } from '../auth/sede-scope'
import { TicketAccessPolicy } from '../auth/ticket-access-policy'

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(TrackingEvento) private readonly eventRepo: Repository<TrackingEvento>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Bulto) private readonly bultoRepo: Repository<Bulto>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Sede) private readonly sedeRepo: Repository<Sede>,
    @InjectRepository(Almacen) private readonly almacenRepo: Repository<Almacen>,
    @InjectRepository(UbicacionAlmacen) private readonly ubicacionRepo: Repository<UbicacionAlmacen>,
    @InjectRepository(Manifiesto) private readonly manifiestoRepo: Repository<Manifiesto>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async porTicket(ticketId: string, user?: any) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId }, relations: ['usuarioCreacion', 'sedeRecepcion', 'destino', 'bultos'] })
    if (!ticket) throw new NotFoundException('Ticket no encontrado')
    TicketAccessPolicy.assertRead(user, ticket)
    return this.eventRepo.find({ where: { ticketId }, relations: ['bulto', 'sede', 'almacen', 'ubicacion', 'usuario'], order: { fechaHora: 'ASC' } })
  }

  async porBulto(bultoId: string, user?: any) {
    const bulto = await this.bultoRepo.findOne({ where: { id: bultoId }, relations: ['ticket', 'ticket.usuarioCreacion', 'ticket.sedeRecepcion', 'ticket.destino'] })
    if (!bulto) throw new NotFoundException('Bulto no encontrado')
    TicketAccessPolicy.assertRead(user, bulto.ticket)
    assertSedeAccess(user, bulto.sedeActualId || bulto.ticket?.sedeRecepcionId, 'consultar tracking')
    return this.eventRepo.find({ where: { bultoId }, relations: ['sede', 'almacen', 'ubicacion', 'usuario'], order: { fechaHora: 'ASC' } })
  }

  async registrar(dto: any, usuarioId?: string, user?: any) {
    const ticket = await this.ticketRepo.findOne({ where: { id: dto.ticketId }, relations: ['usuarioCreacion', 'sedeRecepcion', 'destino', 'bultos'] })
    if (!ticket) throw new NotFoundException('Ticket no encontrado')
    TicketAccessPolicy.assertRead(user, ticket)

    let bulto: Bulto | null = null
    if (dto.bultoId) {
      bulto = await this.bultoRepo.findOne({ where: { id: dto.bultoId }, relations: ['ticket'] })
      if (!bulto) throw new NotFoundException('Bulto no encontrado')
      if (bulto.ticketId !== ticket.id) throw new BadRequestException({ statusCode: 400, code: 'BULTO_TICKET_MISMATCH', message: 'El bulto no pertenece al ticket indicado', details: { ticketId: ticket.id, bultoId: bulto.id } })
    }
    const operationalSedeId = bulto?.sedeActualId || ticket.sedeRecepcionId || ticket.usuarioCreacion?.sedeId
    if (!operationalSedeId) throw new BadRequestException({ statusCode: 409, code: 'TRACKING_SITE_REQUIRED', message: 'El tracking requiere una sede operacional determinable', details: {} })
    const eventSedeId = dto.sedeId || operationalSedeId
    if (bulto?.sedeActualId && eventSedeId !== bulto.sedeActualId) throw new BadRequestException({ statusCode: 409, code: 'TRACKING_SITE_MISMATCH', message: 'El tracking debe pertenecer a la sede actual del bulto', details: { sedeId: eventSedeId, sedeActualId: bulto.sedeActualId } })
    assertSedeAccess(user, eventSedeId, 'registrar tracking')

    const sede = await this.sedeRepo.findOneBy({ id: eventSedeId })
    if (!sede) throw new BadRequestException({ statusCode: 400, code: 'SEDE_NOT_FOUND', message: 'La sede de tracking no existe', details: { sedeId: eventSedeId } })
    let almacen: Almacen | null = null
    if (dto.almacenId) {
      almacen = await this.almacenRepo.findOneBy({ id: dto.almacenId })
      if (!almacen) throw new BadRequestException({ statusCode: 400, code: 'WAREHOUSE_NOT_FOUND', message: 'El almacén de tracking no existe', details: { almacenId: dto.almacenId } })
      if (almacen.sedeId !== eventSedeId) throw new BadRequestException({ statusCode: 409, code: 'TRACKING_LOCATION_MISMATCH', message: 'El almacén no pertenece a la sede del tracking', details: { sedeId: eventSedeId, almacenSedeId: almacen.sedeId } })
    }
    let ubicacion: UbicacionAlmacen | null = null
    if (dto.ubicacionId) {
      ubicacion = await this.ubicacionRepo.findOneBy({ id: dto.ubicacionId })
      if (!ubicacion) throw new BadRequestException({ statusCode: 400, code: 'LOCATION_NOT_FOUND', message: 'La ubicación de tracking no existe', details: { ubicacionId: dto.ubicacionId } })
      if (!almacen || ubicacion.almacenId !== almacen.id) throw new BadRequestException({ statusCode: 409, code: 'TRACKING_LOCATION_MISMATCH', message: 'La ubicación no pertenece al almacén indicado', details: { ubicacionAlmacenId: ubicacion.almacenId, almacenId: almacen?.id || null } })
    }
    let manifiesto: Manifiesto | null = null
    if (dto.manifiestoId) {
      manifiesto = await this.manifiestoRepo.findOne({ where: { id: dto.manifiestoId }, relations: ['tickets'] })
      if (!manifiesto) throw new BadRequestException({ statusCode: 400, code: 'MANIFEST_NOT_FOUND', message: 'El manifiesto de tracking no existe', details: { manifiestoId: dto.manifiestoId } })
      if (manifiesto.tickets && !manifiesto.tickets.some(item => item.id === ticket.id)) throw new BadRequestException({ statusCode: 409, code: 'TRACKING_MANIFEST_MISMATCH', message: 'El ticket no pertenece al manifiesto indicado', details: { ticketId: ticket.id, manifiestoId: manifiesto.id } })
      if (bulto && bulto.ticketId !== ticket.id) throw new BadRequestException({ statusCode: 409, code: 'TRACKING_BULTO_MISMATCH', message: 'El bulto no pertenece al ticket del manifiesto', details: {} })
    }
    if (dto.tipoEvento === TipoTrackingEvento.ENTREGADO && dto.metadata?.source !== 'EntregaService') throw new ForbiddenException({ statusCode: 403, code: 'TRACKING_SPECIALIZED_WORKFLOW_REQUIRED', message: 'ENTREGADO debe originarse en el workflow de Entrega', details: {} })

    const usuario = usuarioId ? await this.usuarioRepo.findOneBy({ id: usuarioId }) : null
    return this.dataSource.transaction(async manager => {
      const event = manager.create(TrackingEvento, { ticketId: ticket.id, bultoId: bulto?.id, tipoEvento: dto.tipoEvento as TipoTrackingEvento, fechaHora: dto.fechaHora ? new Date(dto.fechaHora) : new Date(), sedeId: eventSedeId, almacenId: almacen?.id, ubicacionId: ubicacion?.id, usuarioId: usuario?.id, observacion: dto.observacion, metadata: { ...(dto.metadata || {}), ...(manifiesto ? { manifiestoId: manifiesto.id } : {}) } })
      const saved = await manager.save(TrackingEvento, event)
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId: usuario?.id, sedeId: eventSedeId, accion: 'TRACKING_MANUAL', entidad: 'TrackingEvento', entidadId: saved.id, despues: { ticketId: ticket.id, bultoId: bulto?.id || null, tipoEvento: saved.tipoEvento, sedeId: eventSedeId, almacenId: almacen?.id || null, ubicacionId: ubicacion?.id || null }, metadata: { source: 'manual' } }))
      return saved
    })
  }

  async resumenPublico(codigo: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(codigo)
    const ticket = isUuid ? await this.ticketRepo.findOne({ where: [{ id: codigo }, { numeroTicket: codigo }], relations: ['origen', 'destino'] }) : await this.ticketRepo.findOne({ where: { numeroTicket: codigo }, relations: ['origen', 'destino'] })
    if (!ticket) throw new NotFoundException('Código de tracking no encontrado')
    const events = await this.eventRepo.find({ where: { ticketId: ticket.id }, order: { fechaHora: 'ASC' } })
    return { codigo: ticket.numeroTicket, origen: ticket.origen?.nombre, destino: ticket.destino?.nombre, estado: ticket.estado, eventos: events.map(event => ({ tipoEvento: event.tipoEvento, fechaHora: event.fechaHora })) }
  }
}
