import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Manifiesto, EstadoManifiesto } from '../database/entities/operaciones.entity'
import { Destino } from '../database/entities/destino.entity'
import { Ticket, EstadoTicket } from '../database/entities/ticket.entity'
import { Bulto, EstadoBulto } from '../database/entities/bulto.entity'
import { Vehiculo, EstadoVehiculo, Conductor, EstadoConductor } from '../database/entities/flota.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { assertSedeAccess, assertAnySedeAccess, assertManifestOriginAccess, assertManifestDestinationAccess, isGlobalRole } from '../auth/sede-scope'
import { TrackingEvento, TipoTrackingEvento } from '../database/entities/tracking-evento.entity'
import { DesembarqueBulto, DesembarqueSesion, EstadoDesembarqueBulto, EstadoDesembarqueSesion } from '../database/entities/desembarque-fisico.entity'

@Injectable()
export class ManifiestoService {
  constructor(
    @InjectRepository(Manifiesto) private readonly repo: Repository<Manifiesto>,
    @InjectRepository(Destino) private readonly destRepo: Repository<Destino>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Bulto) private readonly bultoRepo: Repository<Bulto>,
    @InjectRepository(Vehiculo) private readonly vehiculoRepo: Repository<Vehiculo>,
    @InjectRepository(Conductor) private readonly conductorRepo: Repository<Conductor>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(TrackingEvento) private readonly trackingRepo: Repository<TrackingEvento>,
    @InjectRepository(DesembarqueSesion) private readonly desembarqueSesionRepo: Repository<DesembarqueSesion>,
    @InjectRepository(DesembarqueBulto) private readonly desembarqueBultoRepo: Repository<DesembarqueBulto>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(params: any, user?: any) {
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))
    const qb = this.repo.createQueryBuilder('m')
      .leftJoinAndSelect('m.origen', 'origen')
      .leftJoinAndSelect('m.destino', 'destino')
      .leftJoinAndSelect('m.vehiculo', 'vehiculo')
      .leftJoinAndSelect('m.conductor', 'conductor')
      .leftJoinAndSelect('m.tickets', 'tickets')
      .orderBy('m.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
    if (!isGlobalRole(user) && user?.sedeId) qb.andWhere('(m.sede_origen_id = :userSedeId OR m.sede_destino_id = :userSedeId)', { userSedeId: user.sedeId })
    if (params.sedeId) { assertSedeAccess(user, params.sedeId, 'consultar manifiestos'); qb.andWhere('(m.sede_origen_id = :requestedSedeId OR m.sede_destino_id = :requestedSedeId)', { requestedSedeId: params.sedeId }) }
    if (params.estado) qb.andWhere('m.estado = :estado', { estado: params.estado })
    const [data, total] = await qb.getManyAndCount()
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findById(id: string, user?: any) {
    const manifest = await this.repo.findOne({
      where: { id },
      relations: ['origen', 'destino', 'programacion', 'vehiculo', 'conductor', 'sedeOrigen', 'sedeDestino', 'tickets', 'tickets.remitente', 'tickets.destinatario', 'tickets.mercaderias', 'tickets.bultos'],
    })
    if (!manifest) throw new NotFoundException('Manifiesto no encontrado')
    assertAnySedeAccess(user, [manifest.sedeOrigenId, manifest.sedeDestinoId], 'consultar manifiestos')
    return manifest
  }

  private async validarFlota(manager: any, dto: any, sedeId?: string) {
    const vehiculo = dto.vehiculoId ? await manager.findOneBy(Vehiculo, { id: dto.vehiculoId }) : null
    const conductor = dto.conductorId ? await manager.findOneBy(Conductor, { id: dto.conductorId }) : null
    if (dto.vehiculoId && (!vehiculo || vehiculo.estado !== EstadoVehiculo.ACTIVO)) throw new BadRequestException('El vehículo no está activo o no existe')
    if (dto.conductorId && (!conductor || conductor.estado !== EstadoConductor.ACTIVO)) throw new BadRequestException('El conductor no está activo o no existe')
    if (sedeId && vehiculo?.sedeId && vehiculo.sedeId !== sedeId) throw new BadRequestException({ statusCode: 400, code: 'FLEET_WRONG_SITE', message: 'El vehículo no pertenece a la sede de origen del manifiesto', details: { vehiculoSedeId: vehiculo.sedeId, manifiestoSedeId: sedeId } })
    if (sedeId && conductor?.sedeId && conductor.sedeId !== sedeId) throw new BadRequestException({ statusCode: 400, code: 'FLEET_WRONG_SITE', message: 'El conductor no pertenece a la sede de origen del manifiesto', details: { conductorSedeId: conductor.sedeId, manifiestoSedeId: sedeId } })
    if (conductor?.fechaVencimientoLicencia && new Date(conductor.fechaVencimientoLicencia) < new Date()) throw new BadRequestException('La licencia del conductor está vencida')
    return { vehiculo, conductor }
  }

  private async assertTicketsNotInActiveManifest(manager: any, ticketIds: string[], currentManifestId?: string) {
    if (!ticketIds.length) return
    const qb = manager.createQueryBuilder()
      .select('mt.ticket_id', 'ticketId')
      .from('manifiesto_tickets', 'mt')
      .innerJoin('manifiestos', 'm', 'm.id = mt.manifiesto_id')
      .where('mt.ticket_id IN (:...ticketIds)', { ticketIds })
      .andWhere('m.estado IN (:...activeStates)', { activeStates: [EstadoManifiesto.ABIERTO, EstadoManifiesto.EN_RUTA, EstadoManifiesto.LLEGADO] })
    if (currentManifestId) qb.andWhere('m.id <> :currentManifestId', { currentManifestId })
    const conflicts = await qb.getRawMany()
    if (conflicts.length > 0) throw new BadRequestException({ statusCode: 409, code: 'TICKET_ALREADY_IN_ACTIVE_MANIFEST', message: 'Uno o más tickets ya pertenecen a un manifiesto activo', details: { ticketIds: [...new Set(conflicts.map((item: any) => item.ticketId))] } })
  }

  async crear(dto: any, usuarioId?: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const origen = await manager.findOne(Destino, { where: { id: dto.origenId }, relations: ['sede'] })
      const destino = await manager.findOne(Destino, { where: { id: dto.destinoId }, relations: ['sede'] })
      if (!origen || !destino) throw new NotFoundException('Origen o destino no encontrado')
      const sedeOrigenId = dto.sedeOrigenId || origen.sedeId || user?.sedeId
      const sedeDestinoId = dto.sedeDestinoId || destino.sedeId
      assertManifestOriginAccess(user, sedeOrigenId, 'crear manifiestos en el origen')
      if (dto.sedeDestinoId && destino.sedeId && dto.sedeDestinoId !== destino.sedeId) throw new BadRequestException({ statusCode: 400, code: 'DESTINATION_SITE_MISMATCH', message: 'La sede destino no corresponde al destino seleccionado', details: { destinoId: destino.id, sedeDestinoId: dto.sedeDestinoId, destinoSedeId: destino.sedeId } })
      const { vehiculo, conductor } = await this.validarFlota(manager, dto, sedeOrigenId)
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext('grael.manifiesto.correlativo'))`)
      const year = new Date().getFullYear()
      const result = await manager.query(`SELECT COALESCE(MAX(CAST(split_part(codigo, '-', 3) AS INTEGER)), 0) AS max FROM manifiestos WHERE codigo LIKE $1`, [`MAN-${year}-%`])
      const next = Number(result?.[0]?.max || 0) + 1
      const ticketIds: string[] = dto.ticketIds?.length ? [...new Set<string>(dto.ticketIds as string[])] : []
      const tickets = ticketIds.length ? await manager.findBy(Ticket, ticketIds.map((id: string) => ({ id }))) : []
      if (ticketIds.length && tickets.length !== ticketIds.length) throw new BadRequestException('Uno o más tickets no existen')
      if (tickets.some(ticket => ticket.anulado)) throw new BadRequestException('No se puede agregar un ticket anulado al manifiesto')
      const routeMismatch = tickets.filter(ticket => ticket.origenId !== origen.id || ticket.destinoId !== destino.id)
      if (routeMismatch.length > 0) throw new BadRequestException({ statusCode: 400, code: 'MANIFEST_ROUTE_MISMATCH', message: 'Uno o más tickets no corresponden a la ruta del manifiesto', details: { tickets: routeMismatch.map(ticket => ticket.numeroTicket), origenId: origen.id, destinoId: destino.id } })
      await this.assertTicketsNotInActiveManifest(manager, ticketIds)
      const manifest = manager.create(Manifiesto, {
        codigo: `MAN-${year}-${String(next).padStart(4, '0')}`,
        origen, destino, fechaViaje: new Date(dto.fechaViaje || new Date()),
        chofer: dto.chofer, placa: dto.placa, estado: EstadoManifiesto.ABIERTO,
        programacionId: dto.programacionId, vehiculo, vehiculoId: vehiculo?.id,
        conductor, conductorId: conductor?.id, usuario, tickets,
        sedeOrigenId, sedeDestinoId,
        observaciones: dto.observaciones,
      })
      return manager.save(Manifiesto, manifest)
    })
  }

  async agregarTickets(id: string, ticketIds: string[], user?: any) {
    return this.dataSource.transaction(async manager => {
      const manifest = await manager.findOne(Manifiesto, { where: { id }, relations: ['tickets', 'origen', 'destino'] })
      if (!manifest) throw new NotFoundException('Manifiesto no encontrado')
      assertManifestOriginAccess(user, manifest.sedeOrigenId, 'agregar tickets a manifiestos')
      if (manifest.estado !== EstadoManifiesto.ABIERTO) throw new BadRequestException('Solo se pueden agregar tickets a un manifiesto abierto')
      const current = new Map((manifest.tickets || []).map(ticket => [ticket.id, ticket]))
      const incoming = await manager.findBy(Ticket, ticketIds.map(ticketId => ({ id: ticketId })))
      if (incoming.length !== ticketIds.length) throw new BadRequestException('Uno o más tickets no existen')
      for (const ticket of incoming) {
        if (ticket.anulado) throw new BadRequestException(`El ticket ${ticket.numeroTicket} está anulado`)
        if (ticket.origenId !== manifest.origen?.id || ticket.destinoId !== manifest.destino?.id) throw new BadRequestException({ statusCode: 400, code: 'MANIFEST_ROUTE_MISMATCH', message: `El ticket ${ticket.numeroTicket} no corresponde a la ruta del manifiesto`, details: { ticketOrigenId: ticket.origenId, ticketDestinoId: ticket.destinoId, origenId: manifest.origen?.id, destinoId: manifest.destino?.id } })
        current.set(ticket.id, ticket)
      }
      await this.assertTicketsNotInActiveManifest(manager, incoming.map(ticket => ticket.id), id)
      manifest.tickets = [...current.values()]
      return manager.save(Manifiesto, manifest)
    })
  }

  async asignarFlota(id: string, dto: any, user?: any) {
    const manifest = await this.repo.findOne({ where: { id }, relations: ['vehiculo', 'conductor'] })
    if (!manifest) throw new NotFoundException('Manifiesto no encontrado')
    assertManifestOriginAccess(user, manifest.sedeOrigenId, 'asignar flota a manifiestos')
    if (manifest.estado !== EstadoManifiesto.ABIERTO) throw new BadRequestException('Solo se puede asignar flota a un manifiesto abierto')
    const { vehiculo, conductor } = await this.validarFlota(this.dataSource.manager, dto, manifest.sedeOrigenId)
    manifest.vehiculo = vehiculo || undefined
    manifest.vehiculoId = vehiculo?.id
    manifest.conductor = conductor || undefined
    manifest.conductorId = conductor?.id
    return this.repo.save(manifest)
  }

  async despachar(id: string, usuarioId?: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const manifest = await manager.findOne(Manifiesto, { where: { id }, relations: ['tickets'] })
      if (!manifest) throw new NotFoundException('Manifiesto no encontrado')
      assertManifestOriginAccess(user, manifest.sedeOrigenId, 'despachar manifiestos')
      if (manifest.estado !== EstadoManifiesto.ABIERTO) throw new BadRequestException('El manifiesto no está abierto')
      if (!manifest.vehiculoId || !manifest.conductorId) throw new BadRequestException({ statusCode: 400, code: 'MANIFEST_FLEET_REQUIRED', message: 'Asigne vehículo y conductor antes de despachar', details: {} })
      if (!manifest.tickets?.length) throw new BadRequestException('No se puede despachar un manifiesto sin tickets')
      const allBultos = [] as Bulto[]
      for (const ticket of manifest.tickets) allBultos.push(...await manager.findBy(Bulto, { ticketId: ticket.id }))
      const loadedBultos = allBultos.filter(bulto => bulto.estado === EstadoBulto.CARGADO)
      if (allBultos.length === 0 || loadedBultos.length !== allBultos.length) throw new BadRequestException({ statusCode: 409, code: 'MANIFEST_INCOMPLETE', message: 'Existen bultos pendientes de cargar; no se puede despachar el manifiesto', details: { expected: allBultos.length, loaded: loadedBultos.length, pending: allBultos.length - loadedBultos.length } })
      const vehiculo = await manager.findOneByOrFail(Vehiculo, { id: manifest.vehiculoId })
      const conductor = await manager.findOneByOrFail(Conductor, { id: manifest.conductorId })
      if (vehiculo.estado !== EstadoVehiculo.ACTIVO || conductor.estado !== EstadoConductor.ACTIVO) throw new BadRequestException('La flota asignada no está activa')
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      manifest.estado = EstadoManifiesto.EN_RUTA
      manifest.fechaSalida = new Date()
      manifest.usuarioCierre = usuario || undefined
      manifest.usuarioCierreId = usuario?.id
      await manager.save(Manifiesto, manifest)
      for (const ticket of manifest.tickets) {
        if (ticket.anulado) continue
        ticket.estado = EstadoTicket.EN_TRANSITO
        await manager.save(Ticket, ticket)
        const bultos = await manager.findBy(Bulto, { ticketId: ticket.id })
        for (const bulto of bultos.filter(item => item.estado === EstadoBulto.CARGADO)) {
          bulto.estado = EstadoBulto.EN_TRANSITO
          await manager.save(Bulto, bulto)
          await manager.save(TrackingEvento, manager.create(TrackingEvento, {
            ticketId: ticket.id, bultoId: bulto.id, tipoEvento: TipoTrackingEvento.DESPACHADO,
            usuarioId: usuario?.id, observacion: `Despacho ${manifest.codigo}`, metadata: { manifiestoId: manifest.id, vehiculoId: vehiculo.id, conductorId: conductor.id },
          }))
        }
      }
      return manager.findOne(Manifiesto, { where: { id }, relations: ['origen', 'destino', 'vehiculo', 'conductor', 'tickets'] })
    })
  }

  async llegada(id: string, usuarioId?: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const manifest = await manager.findOne(Manifiesto, { where: { id }, relations: ['tickets'] })
      if (!manifest) throw new NotFoundException('Manifiesto no encontrado')
      assertManifestDestinationAccess(user, manifest.sedeDestinoId, 'registrar llegada de manifiestos')
      if (manifest.estado !== EstadoManifiesto.EN_RUTA) throw new BadRequestException({ statusCode: 409, code: 'MANIFEST_NOT_IN_ROUTE', message: 'Solo un manifiesto en ruta puede registrar llegada', details: { estado: manifest.estado } })
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      manifest.estado = EstadoManifiesto.LLEGADO
      await manager.save(Manifiesto, manifest)
      for (const ticket of manifest.tickets || []) {
        if (ticket.anulado) continue
        ticket.estado = EstadoTicket.DESEMBARQUE_EN_DESTINO
        await manager.save(Ticket, ticket)
        const bultos = await manager.findBy(Bulto, { ticketId: ticket.id })
        for (const bulto of bultos) {
          if ([EstadoBulto.ANULADO, EstadoBulto.ENTREGADO].includes(bulto.estado)) continue
          await manager.save(TrackingEvento, manager.create(TrackingEvento, {
            ticketId: ticket.id, bultoId: bulto.id, tipoEvento: TipoTrackingEvento.LLEGADA_SEDE,
            usuarioId: usuario?.id, observacion: `Llegada ${manifest.codigo}; pendiente de desembarque`, metadata: { manifiestoId: manifest.id },
          }))
        }
      }
      return manager.findOne(Manifiesto, { where: { id }, relations: ['origen', 'destino', 'vehiculo', 'conductor', 'tickets'] })
    })
  }

  async resumenLlegada(id: string, user?: any) {
    const manifest = await this.findById(id, user)
    const bultos = (manifest.tickets || []).flatMap(ticket => ticket.bultos || [])
    const bultoIds = bultos.map(bulto => bulto.id)
    let arrived = 0
    if (bultoIds.length) {
      const raw = await this.trackingRepo.createQueryBuilder('tracking')
        .select('COUNT(DISTINCT tracking.bultoId)', 'count')
        .where('tracking.bultoId IN (:...bultoIds)', { bultoIds })
        .andWhere('tracking.tipoEvento = :tipoEvento', { tipoEvento: TipoTrackingEvento.LLEGADA_SEDE })
        .getRawOne()
      arrived = Number(raw?.count || 0)
    }
    const session = await this.desembarqueSesionRepo.findOne({ where: { manifiestoId: manifest.id }, order: { createdAt: 'DESC' } })
    if (!session) {
      const received = bultos.filter(bulto => [EstadoBulto.DESEMBARCADO, EstadoBulto.OBSERVADO, EstadoBulto.FALTANTE].includes(bulto.estado)).length
      const faltantes = bultos.filter(bulto => bulto.estado === EstadoBulto.FALTANTE).length
      const observados = bultos.filter(bulto => bulto.estado === EstadoBulto.OBSERVADO).length
      return { manifiestoId: manifest.id, codigo: manifest.codigo, expected: bultos.length, arrived, received, pending: Math.max(0, bultos.length - received), faltantes, observados, descargados: bultos.filter(bulto => bulto.estado === EstadoBulto.DESEMBARCADO).length, physicalSession: false }
    }
    const records = await this.desembarqueBultoRepo.find({ where: { sesionId: session.id } })
    const scannedIds = new Set(records.map(record => record.bultoId))
    const receivedRecords = records.filter(record => [EstadoDesembarqueBulto.RECIBIDO, EstadoDesembarqueBulto.DANADO].includes(record.estado))
    const damaged = records.filter(record => record.estado === EstadoDesembarqueBulto.DANADO).length
    const extras = records.filter(record => record.estado === EstadoDesembarqueBulto.EXTRA).length
    const observados = records.filter(record => record.estado === EstadoDesembarqueBulto.DANADO || Boolean(record.observacion)).length
    return { manifiestoId: manifest.id, codigo: manifest.codigo, expected: bultos.length, arrived, received: receivedRecords.length, pending: bultos.filter(bulto => !scannedIds.has(bulto.id)).length, faltantes: bultos.filter(bulto => !scannedIds.has(bulto.id)).length, observados, descargados: records.filter(record => record.estado === EstadoDesembarqueBulto.RECIBIDO).length, damaged, extras, physicalSession: true, sessionId: session.id, sessionState: session.estado }
  }

  async resumenCarga(id: string, user?: any) {
    const manifest = await this.findById(id, user)
    const bultos = (manifest.tickets || []).flatMap(ticket => ticket.bultos || [])
    const loaded = bultos.filter(bulto => bulto.estado === EstadoBulto.CARGADO).length
    const observed = bultos.filter(bulto => [EstadoBulto.OBSERVADO, EstadoBulto.FALTANTE].includes(bulto.estado)).length
    return { manifiestoId: manifest.id, codigo: manifest.codigo, expected: bultos.length, loaded, pending: bultos.length - loaded, observed }
  }

  async cargarBulto(id: string, codigo: string, usuarioId?: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const manifest = await manager.findOne(Manifiesto, { where: { id }, relations: ['tickets'] })
      if (!manifest) throw new NotFoundException('Manifiesto no encontrado')
      assertManifestOriginAccess(user, manifest.sedeOrigenId, 'cargar bultos en manifiestos')
      if (manifest.estado !== EstadoManifiesto.ABIERTO) throw new BadRequestException('Solo se pueden cargar bultos en un manifiesto abierto')
      const bulto = await manager.findOne(Bulto, { where: { codigo }, relations: ['ticket'] })
      if (!bulto) throw new NotFoundException('Bulto no encontrado')
      if (!(manifest.tickets || []).some(ticket => ticket.id === bulto.ticketId)) throw new BadRequestException({ statusCode: 400, code: 'BULTO_NOT_IN_MANIFEST', message: 'El bulto no pertenece al manifiesto', details: { codigo } })
      if (bulto.estado === EstadoBulto.CARGADO) return { bulto, alreadyLoaded: true, message: 'El bulto ya estaba cargado; no se duplicó el tracking' }
      if (![EstadoBulto.EN_ALMACEN, EstadoBulto.PROGRAMADO].includes(bulto.estado)) throw new BadRequestException({ statusCode: 409, code: 'BULTO_NOT_LOADABLE', message: `El bulto está en estado ${bulto.estado}`, details: { codigo, estado: bulto.estado } })
      bulto.estado = EstadoBulto.CARGADO
      const saved = await manager.save(Bulto, bulto)
      await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: bulto.ticketId, bultoId: bulto.id, tipoEvento: TipoTrackingEvento.CARGADO, usuarioId, observacion: `Carguío ${manifest.codigo}`, metadata: { manifiestoId: manifest.id, codigo } }))
      return saved
    })
  }

  async cambiarEstado(id: string, estado: EstadoManifiesto, user?: any, motivo?: string) {
    return this.dataSource.transaction(async manager => {
      const manifest = await manager.findOne(Manifiesto, { where: { id }, relations: ['tickets'] })
      if (!manifest) throw new NotFoundException('Manifiesto no encontrado')
      const phaseAccess = estado === EstadoManifiesto.EN_RUTA ? manifest.sedeOrigenId : manifest.sedeDestinoId
      if (estado === EstadoManifiesto.EN_RUTA) assertManifestOriginAccess(user, phaseAccess, 'cerrar/despachar el origen del manifiesto')
      else assertManifestDestinationAccess(user, phaseAccess, 'operar el destino del manifiesto')
      const allowed: Record<EstadoManifiesto, EstadoManifiesto[]> = {
        [EstadoManifiesto.ABIERTO]: [EstadoManifiesto.EN_RUTA],
        [EstadoManifiesto.EN_RUTA]: [EstadoManifiesto.LLEGADO],
        [EstadoManifiesto.LLEGADO]: [EstadoManifiesto.CERRADO],
        [EstadoManifiesto.CERRADO]: [],
      }
      if (manifest.estado !== estado && !allowed[manifest.estado]?.includes(estado)) throw new BadRequestException({ statusCode: 400, code: 'MANIFEST_INVALID_STATE', message: `El manifiesto no puede pasar de ${manifest.estado} a ${estado}`, details: { from: manifest.estado, to: estado } })
      if (estado === EstadoManifiesto.CERRADO) {
        const session = await manager.findOne(DesembarqueSesion, { where: { manifiestoId: manifest.id }, order: { createdAt: 'DESC' } })
        if (!session || session.estado !== EstadoDesembarqueSesion.CERRADA) {
          throw new BadRequestException({ statusCode: 409, code: 'MANIFEST_PHYSICAL_UNLOADING_REQUIRED', message: 'No se puede cerrar el manifiesto sin una sesión física de desembarque cerrada', details: { manifiestoId: manifest.id, sessionId: session?.id || null, sessionState: session?.estado || null } })
        }
        const bultos: Bulto[] = []
        for (const ticket of manifest.tickets || []) bultos.push(...await manager.findBy(Bulto, { ticketId: ticket.id }))
        const records = await manager.find(DesembarqueBulto, { where: { sesionId: session.id } })
        const expectedIds = new Set(bultos.map(bulto => bulto.id))
        const expectedRecords = records.filter(record => expectedIds.has(record.bultoId))
        const scannedIds = new Set(expectedRecords.map(record => record.bultoId))
        const summary = {
          expected: bultos.length,
          received: expectedRecords.filter(record => [EstadoDesembarqueBulto.RECIBIDO, EstadoDesembarqueBulto.DANADO].includes(record.estado)).length,
          pending: bultos.filter(bulto => !scannedIds.has(bulto.id)).length,
          faltantes: expectedRecords.filter(record => record.estado === EstadoDesembarqueBulto.FALTANTE).length,
          dañados: expectedRecords.filter(record => record.estado === EstadoDesembarqueBulto.DANADO).length,
          extras: records.filter(record => record.estado === EstadoDesembarqueBulto.EXTRA || !expectedIds.has(record.bultoId)).length,
          observados: records.filter(record => record.estado === EstadoDesembarqueBulto.DANADO || record.estado === EstadoDesembarqueBulto.FALTANTE || Boolean(record.observacion)).length,
        }
        const hasDifferences = summary.faltantes > 0 || summary.dañados > 0 || summary.extras > 0 || summary.observados > 0 || summary.pending > 0
        if (summary.expected === 0) throw new BadRequestException({ statusCode: 409, code: 'MANIFEST_EMPTY', message: 'No se puede cerrar un manifiesto sin bultos', details: { ...summary, hasDifferences } })
        if (hasDifferences && !motivo?.trim()) throw new BadRequestException({ statusCode: 409, code: 'MANIFEST_DIFFERENCE_REASON_REQUIRED', message: 'El cierre con diferencias requiere motivo obligatorio', details: { ...summary, hasDifferences } })
        if (hasDifferences) manifest.observaciones = [manifest.observaciones, `Cierre con diferencia: ${motivo!.trim()}`].filter(Boolean).join(' | ')
      }
      manifest.estado = estado
      return manager.save(Manifiesto, manifest)
    })
  }
}
