import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Transbordo, EstadoTransbordo, Manifiesto } from '../database/entities/operaciones.entity'
import { Destino } from '../database/entities/destino.entity'
import { Ticket, EstadoTicket } from '../database/entities/ticket.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { Bulto, EstadoBulto } from '../database/entities/bulto.entity'
import { Vehiculo, EstadoVehiculo, Conductor, EstadoConductor } from '../database/entities/flota.entity'
import { Sede } from '../database/entities/sede.entity'
import { TrackingEvento, TipoTrackingEvento } from '../database/entities/tracking-evento.entity'
import { assertSedeAccess, effectiveSedeId } from '../auth/sede-scope'
import { CreateTransbordoDto, TransbordoQueryDto, UpdateTransbordoFleetDto } from '../common/dto/transbordo.dto'

@Injectable()
export class TransbordoService {
  constructor(
    @InjectRepository(Transbordo) private readonly repo: Repository<Transbordo>,
    @InjectRepository(Destino) private readonly destRepo: Repository<Destino>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Bulto) private readonly bultoRepo: Repository<Bulto>,
    @InjectRepository(Vehiculo) private readonly vehiculoRepo: Repository<Vehiculo>,
    @InjectRepository(Conductor) private readonly conductorRepo: Repository<Conductor>,
    @InjectRepository(Sede) private readonly sedeRepo: Repository<Sede>,
    @InjectRepository(TrackingEvento) private readonly trackingRepo: Repository<TrackingEvento>,
    @InjectRepository(Manifiesto) private readonly manifiestoRepo: Repository<Manifiesto>,
    private readonly dataSource: DataSource,
  ) {}

  private assertActor(user?: any) {
    if (!user?.sub) throw new ForbiddenException({ statusCode: 403, code: 'ACTOR_REQUIRED', message: 'La operación requiere usuario autenticado' })
  }

  private assertTransbordoScope(transbordo: Transbordo, user?: any) {
    assertSedeAccess(user, transbordo.sedeId, 'operar el transbordo')
  }

  async listar(params: TransbordoQueryDto, user?: any) {
    if (params.sedeId) assertSedeAccess(user, params.sedeId, 'consultar transbordos')
    const scopeSedeId = effectiveSedeId(user, params.sedeId)
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))
    const qb = this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.origen', 'origen').leftJoinAndSelect('t.destino', 'destino').leftJoinAndSelect('t.desembarqueEn', 'desembarque')
      .leftJoinAndSelect('t.sede', 'sede').leftJoinAndSelect('t.vehiculoNuevo', 'vehiculoNuevo').leftJoinAndSelect('t.conductorNuevo', 'conductorNuevo')
      .leftJoinAndSelect('t.tickets', 'tickets').orderBy('t.createdAt', 'DESC').skip((page - 1) * limit).take(limit)
    if (scopeSedeId) qb.andWhere('t.sede_id = :scopeSedeId', { scopeSedeId })
    if (params.origenId) qb.andWhere('t.origen_id = :oid', { oid: params.origenId })
    if (params.destinoId) qb.andWhere('t.destino_id = :did', { did: params.destinoId })
    if (params.desembarqueId) qb.andWhere('t.desembarque_id = :deid', { deid: params.desembarqueId })
    if (params.estado) qb.andWhere('t.estado = :estado', { estado: params.estado })
    if (params.fechaInicio) qb.andWhere('t.created_at >= :fechaInicio', { fechaInicio: new Date(`${params.fechaInicio}T00:00:00`) })
    if (params.fechaFin) qb.andWhere('t.created_at <= :fechaFin', { fechaFin: new Date(`${params.fechaFin}T23:59:59`) })
    const [data, total] = await qb.getManyAndCount()
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findById(id: string, user?: any) {
    const transbordo = await this.repo.findOne({ where: { id }, relations: ['origen', 'destino', 'desembarqueEn', 'sede', 'vehiculoAnterior', 'vehiculoNuevo', 'conductorAnterior', 'conductorNuevo', 'tickets', 'tickets.bultos', 'usuario'] })
    if (!transbordo) throw new NotFoundException(`Transbordo ${id} no encontrado`)
    this.assertTransbordoScope(transbordo, user)
    return transbordo
  }

  private async validarFlota(manager: any, dto: CreateTransbordoDto | UpdateTransbordoFleetDto, sedeId: string) {
    const vehiculoNuevo = dto.vehiculoNuevoId ? await manager.findOneBy(Vehiculo, { id: dto.vehiculoNuevoId }) : null
    const conductorNuevo = dto.conductorNuevoId ? await manager.findOneBy(Conductor, { id: dto.conductorNuevoId }) : null
    if (dto.vehiculoNuevoId && (!vehiculoNuevo || vehiculoNuevo.estado !== EstadoVehiculo.ACTIVO)) throw new BadRequestException('El vehículo nuevo no está activo o no existe')
    if (dto.conductorNuevoId && (!conductorNuevo || conductorNuevo.estado !== EstadoConductor.ACTIVO)) throw new BadRequestException('El conductor nuevo no está activo o no existe')
    if (vehiculoNuevo && vehiculoNuevo.sedeId && vehiculoNuevo.sedeId !== sedeId) throw new ForbiddenException({ statusCode: 403, code: 'FLEET_SITE_MISMATCH', message: 'El vehículo no pertenece a la sede del transbordo' })
    if (conductorNuevo && conductorNuevo.sedeId && conductorNuevo.sedeId !== sedeId) throw new ForbiddenException({ statusCode: 403, code: 'FLEET_SITE_MISMATCH', message: 'El conductor no pertenece a la sede del transbordo' })
    return { vehiculoNuevo, conductorNuevo }
  }

  async crear(dto: CreateTransbordoDto, user?: any) {
    this.assertActor(user)
    assertSedeAccess(user, dto.sedeId, 'crear transbordos')
    return this.dataSource.transaction(async manager => {
      const origen = await manager.findOneBy(Destino, { id: dto.origenId })
      const destino = await manager.findOneBy(Destino, { id: dto.destinoId })
      const sede = await manager.findOneBy(Sede, { id: dto.sedeId })
      if (!origen || !destino || !sede) throw new NotFoundException('Sede u origen/destino no encontrado')
      if (origen.id === destino.id) throw new BadRequestException('El origen y destino del transbordo deben ser distintos')
      const desembarqueEn = dto.desembarqueId ? await manager.findOneBy(Destino, { id: dto.desembarqueId }) : null
      if (dto.desembarqueId && !desembarqueEn) throw new NotFoundException('Destino de desembarque no encontrado')
      const manifiesto = dto.manifiestoId ? await manager.findOneBy(Manifiesto, { id: dto.manifiestoId }) : null
      if (dto.manifiestoId && !manifiesto) throw new NotFoundException('Manifiesto no encontrado')
      const { vehiculoNuevo, conductorNuevo } = await this.validarFlota(manager, dto, dto.sedeId)
      const usuario = await manager.findOneBy(Usuario, { id: user.sub })
      if (!usuario) throw new NotFoundException('Usuario operador no encontrado')
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext('grael.transbordo.correlativo'))`)
      const year = new Date().getFullYear()
      const result = await manager.query(`SELECT COUNT(*)::int AS count FROM transbordos WHERE codigo LIKE $1`, [`TRANS-${year}-%`])
      const next = Number(result?.[0]?.count || 0) + 1
      return manager.save(Transbordo, manager.create(Transbordo, { codigo: `TRANS-${year}-${String(next).padStart(4, '0')}`, origen, destino, desembarqueEn: desembarqueEn || undefined, sede, sedeId: sede.id, manifiestoId: manifiesto?.id, vehiculoAnteriorId: dto.vehiculoAnteriorId, conductorAnteriorId: dto.conductorAnteriorId, vehiculoNuevo, vehiculoNuevoId: vehiculoNuevo?.id, conductorNuevo, conductorNuevoId: conductorNuevo?.id, fechaHora: new Date(), motivo: dto.motivo, estado: EstadoTransbordo.ABIERTO, usuario }))
    })
  }

  async actualizarFlota(id: string, dto: UpdateTransbordoFleetDto, user?: any) {
    this.assertActor(user)
    return this.dataSource.transaction(async manager => {
      const transbordo = await manager.findOne(Transbordo, { where: { id }, relations: ['sede'] })
      if (!transbordo) throw new NotFoundException(`Transbordo ${id} no encontrado`)
      this.assertTransbordoScope(transbordo, user)
      if (transbordo.estado !== EstadoTransbordo.ABIERTO) throw new BadRequestException('Solo se puede cambiar la flota de un transbordo abierto')
      const { vehiculoNuevo, conductorNuevo } = await this.validarFlota(manager, dto, transbordo.sedeId)
      transbordo.vehiculoNuevo = vehiculoNuevo || undefined; transbordo.vehiculoNuevoId = vehiculoNuevo?.id
      transbordo.conductorNuevo = conductorNuevo || undefined; transbordo.conductorNuevoId = conductorNuevo?.id
      if (dto.motivo !== undefined) transbordo.motivo = dto.motivo
      return manager.save(Transbordo, transbordo)
    })
  }

  private async assertTicketCompatible(manager: any, transbordo: Transbordo, ticketId: string, user?: any) {
    const ticket = await manager.findOne(Ticket, { where: { id: ticketId }, relations: ['usuarioCreacion', 'bultos'] })
    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} no encontrado`)
    if (ticket.anulado || ticket.estado === EstadoTicket.ENTREGADO) throw new BadRequestException('El ticket está anulado o entregado')
    const custodyBultos = (ticket.bultos || []).filter(bulto => ![EstadoBulto.ANULADO, EstadoBulto.ENTREGADO].includes(bulto.estado))
    if (!custodyBultos.length) throw new BadRequestException('El ticket no tiene bultos disponibles para transbordo')
    const atTransbordo = custodyBultos.filter(bulto => bulto.sedeActualId === transbordo.sedeId)
    if (!atTransbordo.length) throw new ForbiddenException({ statusCode: 403, code: 'CUSTODY_SITE_MISMATCH', message: 'Ningún bulto disponible se encuentra físicamente en la sede del transbordo' })
    for (const bulto of atTransbordo) assertSedeAccess(user, bulto.sedeActualId, 'asociar el bulto en custodia')
    return ticket
  }

  async agregarTicket(transbordoId: string, ticketId: string, user?: any) {
    this.assertActor(user)
    return this.dataSource.transaction(async manager => {
      const transbordo = await manager.findOne(Transbordo, { where: { id: transbordoId }, relations: ['tickets', 'sede'] })
      if (!transbordo) throw new NotFoundException(`Transbordo ${transbordoId} no encontrado`)
      this.assertTransbordoScope(transbordo, user)
      if (transbordo.estado !== EstadoTransbordo.ABIERTO) throw new BadRequestException('Solo se puede editar un transbordo abierto')
      const ticket = await this.assertTicketCompatible(manager, transbordo, ticketId, user)
      const yaAsignado = await manager.createQueryBuilder(Transbordo, 't').innerJoin('t.tickets', 'ticket', 'ticket.id = :ticketId', { ticketId }).andWhere('t.id != :transbordoId', { transbordoId }).andWhere('t.estado != :cerrado', { cerrado: EstadoTransbordo.CERRADO }).getOne()
      if (yaAsignado) throw new BadRequestException('El ticket ya pertenece a otro transbordo abierto')
      if (!(transbordo.tickets || []).some(item => item.id === ticketId)) transbordo.tickets = [...(transbordo.tickets || []), ticket]
      return manager.save(Transbordo, transbordo)
    })
  }

  async quitarTicket(transbordoId: string, ticketId: string, user?: any) {
    this.assertActor(user)
    return this.dataSource.transaction(async manager => {
      const transbordo = await manager.findOne(Transbordo, { where: { id: transbordoId }, relations: ['tickets', 'sede'] })
      if (!transbordo) throw new NotFoundException(`Transbordo ${transbordoId} no encontrado`)
      this.assertTransbordoScope(transbordo, user)
      if (transbordo.estado !== EstadoTransbordo.ABIERTO) throw new BadRequestException('Solo se puede editar un transbordo abierto')
      transbordo.tickets = (transbordo.tickets || []).filter(item => item.id !== ticketId)
      return manager.save(Transbordo, transbordo)
    })
  }

  async cambiarEstado(id: string, estado: EstadoTransbordo, user?: any) {
    this.assertActor(user)
    if (!Object.values(EstadoTransbordo).includes(estado)) throw new BadRequestException('Estado inválido')
    return this.dataSource.transaction(async manager => {
      const transbordo = await manager.findOne(Transbordo, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!transbordo) throw new NotFoundException(`Transbordo ${id} no encontrado`)
      const hydrated = await manager.findOne(Transbordo, { where: { id }, relations: ['tickets', 'sede'] })
      transbordo.tickets = hydrated?.tickets || []
      transbordo.sede = hydrated?.sede
      this.assertTransbordoScope(transbordo, user)
      const allowed: Record<EstadoTransbordo, EstadoTransbordo[]> = { [EstadoTransbordo.ABIERTO]: [EstadoTransbordo.EN_TRANSITO], [EstadoTransbordo.EN_TRANSITO]: [EstadoTransbordo.LLEGADO], [EstadoTransbordo.LLEGADO]: [EstadoTransbordo.CERRADO], [EstadoTransbordo.CERRADO]: [] }
      if (transbordo.estado !== estado && !allowed[transbordo.estado]?.includes(estado)) throw new BadRequestException({ statusCode: 400, code: 'TRANSBORDO_INVALID_STATE', message: `El transbordo no puede pasar de ${transbordo.estado} a ${estado}`, details: { from: transbordo.estado, to: estado } })
      transbordo.estado = estado
      await manager.save(Transbordo, transbordo)
      if (estado === EstadoTransbordo.EN_TRANSITO || estado === EstadoTransbordo.LLEGADO) {
        for (const ticketRef of transbordo.tickets || []) {
          const ticket = await manager.findOne(Ticket, { where: { id: ticketRef.id }, relations: ['bultos'] })
          if (!ticket || ticket.anulado) continue
          if (estado === EstadoTransbordo.EN_TRANSITO) ticket.estado = EstadoTicket.EN_TRANSITO
          await manager.save(Ticket, ticket)
          for (const bulto of ticket.bultos || []) {
            if ([EstadoBulto.ANULADO, EstadoBulto.ENTREGADO].includes(bulto.estado)) continue
            if (bulto.sedeActualId && bulto.sedeActualId !== transbordo.sedeId) continue
            bulto.estado = estado === EstadoTransbordo.EN_TRANSITO ? EstadoBulto.TRANSBORDO : EstadoBulto.LLEGADO
            await manager.save(Bulto, bulto)
            await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: ticket.id, bultoId: bulto.id, sedeId: transbordo.sedeId, tipoEvento: estado === EstadoTransbordo.EN_TRANSITO ? TipoTrackingEvento.TRANSBORDO_INICIADO : TipoTrackingEvento.TRANSBORDO_COMPLETADO, usuarioId: user.sub, observacion: `Transbordo ${transbordo.codigo}`, metadata: { transbordoId: transbordo.id, custodySedeId: bulto.sedeActualId } }))
          }
        }
      }
      return transbordo
    })
  }

  async manifiesto(id: string, user?: any) {
    const transbordo = await this.findById(id, user)
    const esc = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const rows = (transbordo.tickets || []).flatMap((ticket: any) => (ticket.bultos?.length ? ticket.bultos : [null]).map((bulto: any) => [ticket.numeroTicket, bulto?.codigo || '', ticket.estado, bulto?.estado || '', ticket.origen?.nombre, ticket.destino?.nombre, ticket.total].map(esc).join(','))).join('\n')
    return ['TICKET,BULTO,ESTADO_TICKET,ESTADO_BULTO,ORIGEN,DESTINO,TOTAL', rows].filter(Boolean).join('\n')
  }
}
