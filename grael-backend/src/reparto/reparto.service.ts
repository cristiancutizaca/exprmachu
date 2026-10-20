import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { PlanillaReparto, PlanillaRepartoDetalle, EstadoPlanillaReparto, EstadoIntentoReparto } from '../database/entities/reparto.entity'
import { Ticket, EstadoTicket, TipoEntrega } from '../database/entities/ticket.entity'
import { Bulto, EstadoBulto } from '../database/entities/bulto.entity'
import { Usuario, RolUsuario } from '../database/entities/usuario.entity'
import { Vehiculo, EstadoVehiculo } from '../database/entities/flota.entity'
import { TrackingEvento, TipoTrackingEvento } from '../database/entities/tracking-evento.entity'
import { Sede } from '../database/entities/sede.entity'
import { Almacen, UbicacionAlmacen } from '../database/entities/almacen.entity'
import { MovimientoAlmacen, TipoMovimientoAlmacen } from '../database/entities/movimiento-almacen.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertSedeAccess, isGlobalRole } from '../auth/sede-scope'
import { TicketDeliveryStateService } from '../tickets/ticket-delivery-state.service'

@Injectable()
export class RepartoService {
  constructor(
    @InjectRepository(PlanillaReparto) private readonly repo: Repository<PlanillaReparto>,
    @InjectRepository(PlanillaRepartoDetalle) private readonly detalleRepo: Repository<PlanillaRepartoDetalle>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Bulto) private readonly bultoRepo: Repository<Bulto>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Vehiculo) private readonly vehiculoRepo: Repository<Vehiculo>,
    @InjectRepository(Sede) private readonly sedeRepo: Repository<Sede>,
    @InjectRepository(TrackingEvento) private readonly trackingRepo: Repository<TrackingEvento>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
    private readonly ticketDeliveryState: TicketDeliveryStateService,
  ) {}

  async listar(query: any, user?: any) {
    const qb = this.repo.createQueryBuilder('p')
      .leftJoinAndSelect('p.sede', 'sede')
      .leftJoinAndSelect('p.vehiculo', 'vehiculo')
      .leftJoinAndSelect('p.repartidor', 'repartidor')
      .orderBy('p.fecha', 'DESC')
    if (!isGlobalRole(user) && user?.sedeId) qb.andWhere('p.sede_id = :sedeId', { sedeId: user.sedeId })
    if (query.sedeId) {
      assertSedeAccess(user, query.sedeId, 'consultar reparto')
      qb.andWhere('p.sede_id = :requestedSedeId', { requestedSedeId: query.sedeId })
    }
    if (query.estado) qb.andWhere('p.estado = :estado', { estado: query.estado })
    if (query.fecha) qb.andWhere('p.fecha = :fecha', { fecha: query.fecha })
    return qb.getMany()
  }

  async detalle(id: string, user?: any) {
    const planilla = await this.repo.findOne({ where: { id }, relations: ['sede', 'vehiculo', 'repartidor'] })
    if (!planilla) throw new NotFoundException('Planilla de reparto no encontrada')
    assertSedeAccess(user, planilla.sedeId, 'consultar reparto')
    const detalles = await this.detalleRepo.find({ where: { planillaId: id }, relations: ['ticket', 'bulto'], order: { createdAt: 'ASC' } })
    return { ...planilla, detalles }
  }

  async crear(dto: any, usuarioId: string, user?: any) {
    const planillaId = await this.dataSource.transaction(async manager => {
      const usuario = await manager.findOneBy(Usuario, { id: usuarioId })
      if (!usuario) throw new NotFoundException('Usuario no encontrado')
      const sedeId = dto.sedeId || usuario.sedeId
      assertSedeAccess(user || usuario, sedeId, 'crear planillas de reparto')
      if (!sedeId) throw new BadRequestException('La planilla requiere sede')
      const sede = await manager.findOneBy(Sede, { id: sedeId })
      if (!sede) throw new NotFoundException('Sede no encontrada')
      const ticketIds = Array.isArray(dto.ticketIds) ? [...new Set(dto.ticketIds)] : []
      if (ticketIds.length === 0) throw new BadRequestException('Seleccione al menos un ticket elegible')
      const tickets = await manager.find(Ticket, { where: ticketIds.map((id: string) => ({ id })), relations: ['bultos'] })
      if (tickets.length !== ticketIds.length) throw new BadRequestException('Uno o más tickets no existen')

      const details: Array<{ ticket: Ticket; bulto: Bulto }> = []
      for (const ticket of tickets) {
        if (ticket.anulado || ticket.tipoEntrega !== TipoEntrega.REPARTO || ![EstadoTicket.LISTO_REPARTO, EstadoTicket.DESEMBARQUE_EN_DESTINO].includes(ticket.estado)) {
          throw new BadRequestException({ statusCode: 400, code: 'DELIVERY_TICKET_NOT_ELIGIBLE', message: `El ticket ${ticket.numeroTicket} no está listo para reparto`, details: { ticketId: ticket.id } })
        }
        const bultos = (ticket.bultos || []).filter(bulto => [EstadoBulto.DESEMBARCADO, EstadoBulto.LISTO_RECOJO].includes(bulto.estado))
        if (bultos.length === 0) throw new BadRequestException(`El ticket ${ticket.numeroTicket} no tiene bultos listos para reparto`)
        for (const bulto of bultos) details.push({ ticket, bulto })
      }

      const activeStates = [EstadoPlanillaReparto.BORRADOR, EstadoPlanillaReparto.ASIGNADO, EstadoPlanillaReparto.EN_RUTA]
      const alreadyAssigned = await manager.getRepository(PlanillaRepartoDetalle)
        .createQueryBuilder('d')
        .innerJoin(PlanillaReparto, 'p', 'p.id = d.planilla_id')
        .where('d.ticket_id IN (:...ticketIds)', { ticketIds })
        .andWhere('p.estado IN (:...activeStates)', { activeStates })
        .getMany()
      if (alreadyAssigned.length > 0) {
        throw new BadRequestException({ statusCode: 409, code: 'TICKET_ALREADY_IN_ACTIVE_MANIFEST', message: 'Uno o más tickets ya están en una planilla activa', details: { ticketIds: [...new Set(alreadyAssigned.map(item => item.ticketId))] } })
      }

      const vehiculo = dto.vehiculoId ? await manager.findOneBy(Vehiculo, { id: dto.vehiculoId }) : null
      if (dto.vehiculoId && !vehiculo) throw new NotFoundException('Vehículo no encontrado')
      if (vehiculo && vehiculo.estado !== EstadoVehiculo.ACTIVO) throw new BadRequestException('El vehículo no está activo')
      if (vehiculo?.sedeId && vehiculo.sedeId !== sedeId) throw new BadRequestException({ statusCode: 400, code: 'FLEET_WRONG_SITE', message: 'El vehículo no pertenece a la sede de la planilla', details: { vehiculoSedeId: vehiculo.sedeId, planillaSedeId: sedeId } })

      const repartidor = dto.repartidorId ? await manager.findOneBy(Usuario, { id: dto.repartidorId }) : null
      if (dto.repartidorId && !repartidor) throw new NotFoundException('Repartidor no encontrado')
      if (repartidor && repartidor.rol !== RolUsuario.REPARTIDOR) throw new BadRequestException('El usuario asignado no tiene rol REPARTIDOR')
      if (repartidor?.sedeId && repartidor.sedeId !== sedeId) throw new BadRequestException({ statusCode: 400, code: 'DELIVERY_WRONG_SITE', message: 'El repartidor no pertenece a la sede de la planilla', details: { repartidorSedeId: repartidor.sedeId, planillaSedeId: sedeId } })

      const planilla = await manager.save(PlanillaReparto, manager.create(PlanillaReparto, {
        fecha: new Date(dto.fecha || new Date()), zona: dto.zona, sede, sedeId, vehiculo, vehiculoId: vehiculo?.id,
        repartidor, repartidorId: repartidor?.id, estado: vehiculo && repartidor ? EstadoPlanillaReparto.ASIGNADO : EstadoPlanillaReparto.BORRADOR,
      }))
      for (const item of details) await manager.save(PlanillaRepartoDetalle, manager.create(PlanillaRepartoDetalle, { planilla, planillaId: planilla.id, ticket: item.ticket, ticketId: item.ticket.id, bulto: item.bulto, bultoId: item.bulto.id }))
      await manager.save(AuditLog, manager.create(AuditLog, {
        usuarioId, sedeId, accion: 'PLANILLA_REPARTO_CREADA', entidad: 'PlanillaReparto', entidadId: planilla.id,
        despues: { estado: planilla.estado, ticketIds, bultos: details.length }, metadata: { source: 'reparto' },
      }))
      return planilla.id
    })
    return this.detalle(planillaId, user)
  }

  async iniciar(id: string, usuarioId: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const planilla = await manager.findOne(PlanillaReparto, { where: { id }, relations: ['sede', 'repartidor', 'vehiculo'] })
      if (!planilla) throw new NotFoundException('Planilla no encontrada')
      assertSedeAccess(user, planilla.sedeId, 'iniciar reparto')
      if (![EstadoPlanillaReparto.ASIGNADO, EstadoPlanillaReparto.BORRADOR].includes(planilla.estado)) throw new BadRequestException('La planilla no está disponible para iniciar')
      if (!planilla.vehiculoId || !planilla.repartidorId) throw new BadRequestException('Asigne vehículo y repartidor antes de iniciar')
      if (planilla.vehiculo?.sedeId && planilla.vehiculo.sedeId !== planilla.sedeId) throw new BadRequestException('El vehículo asignado no pertenece a la sede')
      if (planilla.repartidor?.sedeId && planilla.repartidor.sedeId !== planilla.sedeId) throw new BadRequestException('El repartidor asignado no pertenece a la sede')
      const detalles = await manager.find(PlanillaRepartoDetalle, { where: { planillaId: id } })
      if (detalles.length === 0) throw new BadRequestException('La planilla no tiene bultos')
      const usuario = await manager.findOneBy(Usuario, { id: usuarioId })
      planilla.estado = EstadoPlanillaReparto.EN_RUTA
      await manager.save(PlanillaReparto, planilla)
      const touched = new Set<string>()
      for (const detalle of detalles) {
        if (![EstadoIntentoReparto.PENDIENTE, EstadoIntentoReparto.REPROGRAMADO].includes(detalle.estado)) continue
        const bulto = await manager.findOneByOrFail(Bulto, { id: detalle.bultoId })
        bulto.estado = EstadoBulto.EN_REPARTO
        await manager.save(Bulto, bulto)
        if (!touched.has(detalle.ticketId)) {
          const ticket = await manager.findOneByOrFail(Ticket, { id: detalle.ticketId })
          ticket.estado = EstadoTicket.EN_REPARTO
          await manager.save(Ticket, ticket)
          touched.add(detalle.ticketId)
        }
        await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: detalle.ticketId, bultoId: detalle.bultoId, tipoEvento: TipoTrackingEvento.SALIDA_REPARTO, usuarioId: usuario?.id, observacion: 'Salida de reparto', metadata: { planillaId: id } }))
      }
      for (const ticketId of touched) await this.ticketDeliveryState.recalculate(manager, ticketId)
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId: planilla.sedeId, accion: 'REPARTO_INICIADO', entidad: 'PlanillaReparto', entidadId: id, despues: { estado: planilla.estado }, metadata: { bultos: detalles.length } }))
      return planilla
    })
  }

  async registrarIntento(id: string, dto: any, usuarioId: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const detalle = await manager.findOne(PlanillaRepartoDetalle, { where: { id }, relations: ['planilla', 'bulto', 'ticket'] })
      if (!detalle) throw new NotFoundException('Detalle de reparto no encontrado')
      assertSedeAccess(user, detalle.planilla?.sedeId, 'registrar intentos de entrega')
      if (detalle.planilla?.estado !== EstadoPlanillaReparto.EN_RUTA) throw new BadRequestException('La planilla no está en ruta')
      if (!Object.values(EstadoIntentoReparto).includes(dto.estado)) throw new BadRequestException('Estado de intento inválido')
      if (detalle.estado === EstadoIntentoReparto.ENTREGADO || detalle.estado === EstadoIntentoReparto.RETORNADO) throw new BadRequestException('El detalle de reparto ya tiene un resultado final')
      const usuario = await manager.findOneBy(Usuario, { id: usuarioId })
      detalle.estado = dto.estado
      detalle.intentos = Number(detalle.intentos || 0) + 1
      detalle.ultimaFechaIntento = new Date()
      detalle.observacion = dto.observacion
      detalle.documentoReceptor = dto.documentoReceptor
      detalle.nombreReceptor = dto.nombreReceptor
      await manager.save(PlanillaRepartoDetalle, detalle)
      if (dto.estado === EstadoIntentoReparto.ENTREGADO) {
        detalle.bulto.estado = EstadoBulto.ENTREGADO
        await manager.save(Bulto, detalle.bulto)
        await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: detalle.ticketId, bultoId: detalle.bultoId, tipoEvento: TipoTrackingEvento.ENTREGADO, usuarioId: usuario?.id, observacion: dto.observacion || 'Entrega en reparto', metadata: { planillaId: detalle.planillaId, detalleId: detalle.id } }))
        await this.ticketDeliveryState.recalculate(manager, detalle.ticketId)
      } else if (dto.estado === EstadoIntentoReparto.REPROGRAMADO) {
        detalle.bulto.estado = EstadoBulto.LISTO_RECOJO
        await manager.save(Bulto, detalle.bulto)
        const ticket = await manager.findOneByOrFail(Ticket, { id: detalle.ticketId })
        ticket.estado = EstadoTicket.LISTO_REPARTO
        await manager.save(Ticket, ticket)
        await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: detalle.ticketId, bultoId: detalle.bultoId, tipoEvento: TipoTrackingEvento.OBSERVADO, usuarioId: usuario?.id, observacion: dto.observacion || 'Entrega reprogramada', metadata: { planillaId: detalle.planillaId, detalleId: detalle.id, estado: dto.estado } }))
      } else {
        await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: detalle.ticketId, bultoId: detalle.bultoId, tipoEvento: TipoTrackingEvento.INTENTO_ENTREGA, usuarioId: usuario?.id, observacion: dto.observacion, metadata: { planillaId: detalle.planillaId, detalleId: detalle.id, estado: dto.estado } }))
      }
      return detalle
    })
  }

  async retorno(id: string, dto: { almacenDestinoId: string; ubicacionDestinoId: string; observacion?: string }, usuarioId: string, user?: any) {
    const result = await this.dataSource.transaction(async manager => {
      const planilla = await manager.findOne(PlanillaReparto, { where: { id }, relations: ['sede'] })
      if (!planilla) throw new NotFoundException('Planilla no encontrada')
      assertSedeAccess(user, planilla.sedeId, 'registrar retorno de reparto')
      if (planilla.estado !== EstadoPlanillaReparto.EN_RUTA) throw new BadRequestException('Solo una planilla en ruta puede retornar')
      const almacen = await manager.findOne(Almacen, { where: { id: dto.almacenDestinoId }, relations: ['sede'] })
      if (!almacen) throw new NotFoundException('Almacén de retorno no encontrado')
      if (almacen.sedeId !== planilla.sedeId) throw new BadRequestException('El almacén de retorno no pertenece a la sede')
      const ubicacion = await manager.findOne(UbicacionAlmacen, { where: { id: dto.ubicacionDestinoId }, relations: ['almacen'] })
      if (!ubicacion) throw new NotFoundException('Ubicación de retorno no encontrada')
      if (ubicacion.almacenId !== almacen.id) throw new BadRequestException('La ubicación no pertenece al almacén de retorno')
      const detalles = await manager.find(PlanillaRepartoDetalle, { where: { planillaId: id }, relations: ['ticket', 'bulto'] })
      const pending = detalles.filter(item => ![EstadoIntentoReparto.ENTREGADO, EstadoIntentoReparto.RETORNADO].includes(item.estado))
      if (pending.length === 0) throw new BadRequestException('No existen bultos pendientes de retorno')
      const usuario = await manager.findOneBy(Usuario, { id: usuarioId })
      const ticketIds = new Set<string>()
      for (const detalle of pending) {
        const bulto = await manager.findOneByOrFail(Bulto, { id: detalle.bultoId })
        const previousState = bulto.estado
        bulto.estado = EstadoBulto.EN_ALMACEN
        bulto.sedeActualId = planilla.sedeId
        bulto.almacenActualId = almacen.id
        bulto.ubicacionActualId = ubicacion.id
        await manager.save(Bulto, bulto)
        detalle.estado = EstadoIntentoReparto.RETORNADO
        detalle.observacion = dto.observacion || 'Retorno a agencia'
        await manager.save(PlanillaRepartoDetalle, detalle)
        ticketIds.add(detalle.ticketId)
        await manager.save(MovimientoAlmacen, manager.create(MovimientoAlmacen, { bultoId: bulto.id, sedeId: planilla.sedeId, almacenDestinoId: almacen.id, ubicacionDestinoId: ubicacion.id, usuarioId, tipo: TipoMovimientoAlmacen.INGRESO, referenciaTipo: 'REPARTO_RETORNO', referenciaId: id, motivo: dto.observacion || 'Retorno de reparto' }))
        await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: detalle.ticketId, bultoId: bulto.id, tipoEvento: TipoTrackingEvento.DEVUELTO, usuarioId: usuario?.id, observacion: dto.observacion || 'Retorno a agencia', metadata: { planillaId: id, previousState, almacenId: almacen.id, ubicacionId: ubicacion.id } }))
      }
      for (const ticketId of ticketIds) {
        const ticket = await manager.findOneByOrFail(Ticket, { id: ticketId })
        if (ticket.estado !== EstadoTicket.ENTREGADO) {
          ticket.estado = EstadoTicket.LISTO_REPARTO
          await manager.save(Ticket, ticket)
        }
      }
      planilla.estado = EstadoPlanillaReparto.FINALIZADO
      planilla.observacion = dto.observacion || `Retorno confirmado por ${usuarioId}`
      await manager.save(PlanillaReparto, planilla)
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId: planilla.sedeId, accion: 'REPARTO_RETORNADO', entidad: 'PlanillaReparto', entidadId: id, antes: { estado: EstadoPlanillaReparto.EN_RUTA }, despues: { estado: planilla.estado, almacenDestinoId: almacen.id, ubicacionDestinoId: ubicacion.id }, metadata: { returnedDetails: pending.map(item => item.id) } }))
      return planilla.id
    })
    return this.detalle(result, user)
  }

  async finalizar(id: string, usuarioId: string, user?: any) {
    const planilla = await this.repo.findOne({ where: { id }, relations: ['sede'] })
    if (!planilla) throw new NotFoundException('Planilla no encontrada')
    assertSedeAccess(user, planilla.sedeId, 'finalizar reparto')
    if (planilla.estado !== EstadoPlanillaReparto.EN_RUTA) throw new BadRequestException('Solo una planilla en ruta puede finalizarse')
    const details = await this.detalleRepo.find({ where: { planillaId: id }, relations: ['ticket', 'bulto'] })
    if (details.length === 0) throw new BadRequestException('La planilla no tiene detalles')
    const unresolved = details.filter(item => ![EstadoIntentoReparto.ENTREGADO, EstadoIntentoReparto.RETORNADO, EstadoIntentoReparto.REPROGRAMADO].includes(item.estado))
    if (unresolved.length > 0) throw new BadRequestException({ statusCode: 409, code: 'DELIVERY_SHEET_UNRESOLVED', message: 'No se puede finalizar con entregas sin resultado operacional', details: { details: unresolved.map(item => item.id) } })
    if (details.some(item => item.bulto.estado === EstadoBulto.EN_REPARTO)) throw new BadRequestException({ statusCode: 409, code: 'DELIVERY_SHEET_ACTIVE_BULK', message: 'No se puede finalizar con bultos aún en reparto', details: {} })
    planilla.estado = EstadoPlanillaReparto.FINALIZADO
    planilla.observacion = planilla.observacion || `Finalizado por ${usuarioId}`
    const saved = await this.repo.save(planilla)
    return saved
  }
}
