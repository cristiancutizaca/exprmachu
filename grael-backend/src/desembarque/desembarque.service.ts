import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Desembarque, EstadoDesembarque, EstadoManifiesto, Manifiesto } from '../database/entities/operaciones.entity'
import { DesembarqueBulto, DesembarqueSesion, EstadoDesembarqueBulto, EstadoDesembarqueSesion } from '../database/entities/desembarque-fisico.entity'
import { Almacen, UbicacionAlmacen } from '../database/entities/almacen.entity'
import { Ticket, EstadoTicket } from '../database/entities/ticket.entity'
import { Bulto, EstadoBulto } from '../database/entities/bulto.entity'
import { TrackingEvento, TipoTrackingEvento } from '../database/entities/tracking-evento.entity'
import { Usuario, RolUsuario } from '../database/entities/usuario.entity'
import { Incidencia, EstadoIncidencia, TipoIncidencia } from '../database/entities/incidencia.entity'
import { MovimientoAlmacen, TipoMovimientoAlmacen } from '../database/entities/movimiento-almacen.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertSedeAccess, isGlobalRole } from '../auth/sede-scope'

@Injectable()
export class DesembarqueService {
  constructor(
    @InjectRepository(Desembarque) private readonly repo: Repository<Desembarque>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Bulto) private readonly bultoRepo: Repository<Bulto>,
    @InjectRepository(TrackingEvento) private readonly trackingRepo: Repository<TrackingEvento>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Incidencia) private readonly incidenciaRepo: Repository<Incidencia>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(params: any, user?: any) {
    const qb = this.repo.createQueryBuilder('d')
      .leftJoinAndSelect('d.ticket', 'ticket')
      .leftJoinAndSelect('ticket.remitente', 'rem')
      .leftJoinAndSelect('ticket.destinatario', 'des')
      .leftJoinAndSelect('ticket.mercaderias', 'mercs')
      .leftJoinAndSelect('ticket.bultos', 'bultos')
      .orderBy('d.createdAt', 'DESC')
    if (!isGlobalRole(user) && user?.sedeId) qb.andWhere('bultos.sede_actual_id = :sedeId', { sedeId: user.sedeId })
    if (params.estado) qb.andWhere('d.estado = :es', { es: params.estado })
    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  private async assertTicketSite(manager: any, ticketId: string, user?: any) {
    const bultos = await manager.findBy(Bulto, { ticketId })
    for (const bulto of bultos) assertSedeAccess(user, bulto.sedeActualId, 'operar desembarque')
    return bultos
  }

  async verificar(id: string, usuarioId?: string, user?: any, legacy = false) {
    if (!legacy) throw new BadRequestException({ statusCode: 409, code: 'LEGACY_UNLOADING_REQUIRES_EXPLICIT_FLAG', message: 'El desembarque operativo V7 requiere sesión física y escaneo por bulto; use legacy=true solo para compatibilidad histórica', details: {} })
    return this.dataSource.transaction(async manager => {
      const d = await manager.findOne(Desembarque, { where: { id }, relations: ['ticket'] })
      if (!d) throw new NotFoundException('Desembarque no encontrado')
      if (d.estado !== EstadoDesembarque.PENDIENTE_VERIFICACION) throw new BadRequestException('Estado inválido para verificar')
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      const bultos = await this.assertTicketSite(manager, d.ticketId, user)
      d.usuario = usuario || undefined
      d.estado = EstadoDesembarque.VERIFICADO
      await manager.save(Desembarque, d)
      for (const bulto of bultos) {
        if ([EstadoBulto.ANULADO, EstadoBulto.ENTREGADO].includes(bulto.estado)) continue
        bulto.estado = EstadoBulto.DESEMBARCADO
        await manager.save(Bulto, bulto)
        await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: d.ticketId, bultoId: bulto.id, tipoEvento: TipoTrackingEvento.DESEMBARCADO, usuarioId: usuario?.id, observacion: 'Desembarque verificado', metadata: { desembarqueId: d.id } }))
      }
      return d
    })
  }

  async entregar(id: string, dto: { dniRecibe: string; nombreRecibe: string; observacion?: string }, usuarioId?: string, user?: any, legacy = false) {
    if (!legacy) throw new BadRequestException({ statusCode: 409, code: 'LEGACY_UNLOADING_REQUIRES_EXPLICIT_FLAG', message: 'La entrega legacy no reemplaza el desembarque físico V7; use legacy=true solo para compatibilidad histórica', details: {} })
    return this.dataSource.transaction(async manager => {
      const d = await manager.findOne(Desembarque, { where: { id }, relations: ['ticket'] })
      if (!d) throw new NotFoundException('Desembarque no encontrado')
      if (d.estado === EstadoDesembarque.OBSERVADO) throw new BadRequestException('No se puede finalizar un desembarque observado')
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      const bultos = await this.assertTicketSite(manager, d.ticketId, user)
      d.estado = EstadoDesembarque.ENTREGADO
      d.horaEntrega = new Date()
      d.dniRecibe = dto.dniRecibe
      d.nombreRecibe = dto.nombreRecibe
      d.observacion = dto.observacion
      d.usuario = usuario || undefined
      await manager.save(Desembarque, d)
      for (const bulto of bultos) {
        if ([EstadoBulto.ANULADO, EstadoBulto.ENTREGADO].includes(bulto.estado)) continue
        bulto.estado = EstadoBulto.LISTO_RECOJO
        await manager.save(Bulto, bulto)
        await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: d.ticketId, bultoId: bulto.id, tipoEvento: TipoTrackingEvento.LISTO_RECOJO, usuarioId: usuario?.id, observacion: 'Carga lista para recojo tras desembarque', metadata: { desembarqueId: d.id } }))
      }
      await manager.update(Ticket, d.ticketId, { estado: EstadoTicket.DESEMBARQUE_EN_DESTINO })
      return d
    })
  }

  async observar(id: string, observacion: string, usuarioId?: string, user?: any, legacy = false) {
    if (!legacy) throw new BadRequestException({ statusCode: 409, code: 'LEGACY_UNLOADING_REQUIRES_EXPLICIT_FLAG', message: 'La observación legacy no reemplaza el desembarque físico V7; use legacy=true solo para compatibilidad histórica', details: {} })
    const d = await this.repo.findOne({ where: { id }, relations: ['ticket'] })
    if (!d) throw new NotFoundException('Desembarque no encontrado')
    await this.assertTicketSite(this.dataSource.manager, d.ticketId, user)
    d.estado = EstadoDesembarque.OBSERVADO
    d.observacion = observacion
    d.usuario = usuarioId ? await this.usuarioRepo.findOneBy({ id: usuarioId }) || undefined : undefined
    return this.repo.save(d)
  }

  private async loadSession(manager: any, id: string, user?: any) {
    const session = await manager.findOne(DesembarqueSesion, { where: { id }, relations: ['manifiesto', 'sede', 'almacenDestino', 'ubicacionDestino'] })
    if (!session) throw new NotFoundException('Sesión de desembarque no encontrada')
    assertSedeAccess(user, session.sedeId, 'operar la sesión de desembarque')
    return session
  }

  private async sessionBultos(manager: any, session: DesembarqueSesion) {
    const manifest = await manager.findOne(Manifiesto, { where: { id: session.manifiestoId }, relations: ['tickets'] })
    if (!manifest) throw new NotFoundException('Manifiesto de desembarque no encontrado')
    const all: Bulto[] = []
    for (const ticket of manifest.tickets || []) all.push(...await manager.findBy(Bulto, { ticketId: ticket.id }))
    return { manifest, all }
  }

  async abrirSesion(dto: { manifiestoId: string; almacenDestinoId: string; ubicacionDestinoId: string; observacion?: string }, user?: any) {
    if (!user?.sub) throw new ForbiddenException({ statusCode: 403, code: 'ACTOR_REQUIRED', message: 'La apertura requiere usuario autenticado' })
    return this.dataSource.transaction(async manager => {
      const manifest = await manager.findOne(Manifiesto, { where: { id: dto.manifiestoId }, relations: ['sedeDestino'] })
      if (!manifest) throw new NotFoundException('Manifiesto no encontrado')
      if (manifest.estado !== EstadoManifiesto.LLEGADO) throw new BadRequestException('Solo se puede abrir desembarque para un manifiesto LLEGADO')
      const sedeId = manifest.sedeDestinoId || manifest.sedeOrigenId
      assertSedeAccess(user, sedeId, 'abrir desembarque')
      const almacen = await manager.findOneBy(Almacen, { id: dto.almacenDestinoId })
      const ubicacion = await manager.findOneBy(UbicacionAlmacen, { id: dto.ubicacionDestinoId })
      if (!almacen || !ubicacion) throw new NotFoundException('Almacén o ubicación destino no encontrado')
      if (almacen.sedeId !== sedeId) throw new ForbiddenException({ statusCode: 403, code: 'UNLOADING_WAREHOUSE_SITE_MISMATCH', message: 'El almacén no pertenece a la sede destino' })
      if (ubicacion.almacenId !== almacen.id || ubicacion.activo === false) throw new BadRequestException('La ubicación no pertenece al almacén o está inactiva')
      const existing = await manager.findOne(DesembarqueSesion, { where: { manifiestoId: manifest.id, estado: EstadoDesembarqueSesion.ABIERTA } })
      if (existing) return existing
      const operador = await manager.findOneBy(Usuario, { id: user.sub })
      if (!operador) throw new NotFoundException('Usuario operador no encontrado')
      const session = manager.create(DesembarqueSesion, { manifiesto: manifest, manifiestoId: manifest.id, sedeId, sede: manifest.sedeDestino, almacenDestino: almacen, almacenDestinoId: almacen.id, ubicacionDestino: ubicacion, ubicacionDestinoId: ubicacion.id, usuarioApertura: operador, usuarioAperturaId: operador.id, estado: EstadoDesembarqueSesion.ABIERTA, observacion: dto.observacion })
      return manager.save(DesembarqueSesion, session)
    })
  }

  async resumenSesion(id: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const session = await this.loadSession(manager, id, user)
      const { all } = await this.sessionBultos(manager, session)
      const scanned = await manager.find(DesembarqueBulto, { where: { sesionId: session.id } })
      const scannedIds = new Set(scanned.map(item => item.bultoId))
      return { sesionId: session.id, manifiestoId: session.manifiestoId, expected: all.length, received: scanned.filter(item => item.estado === EstadoDesembarqueBulto.RECIBIDO || item.estado === EstadoDesembarqueBulto.DANADO).length, damaged: scanned.filter(item => item.estado === EstadoDesembarqueBulto.DANADO).length, extras: scanned.filter(item => item.estado === EstadoDesembarqueBulto.EXTRA).length, pending: all.filter(item => !scannedIds.has(item.id)).length, faltantes: all.filter(item => !scannedIds.has(item.id)).length, observed: scanned.filter(item => item.observacion).length, estado: session.estado }
    })
  }

  async escanearBulto(id: string, dto: { codigo: string; estado?: EstadoDesembarqueBulto; observacion?: string }, user?: any) {
    if (!user?.sub) throw new ForbiddenException({ statusCode: 403, code: 'ACTOR_REQUIRED', message: 'El escaneo requiere usuario autenticado' })
    return this.dataSource.transaction(async manager => {
      const session = await this.loadSession(manager, id, user)
      if (session.estado !== EstadoDesembarqueSesion.ABIERTA) throw new BadRequestException('La sesión de desembarque ya está cerrada')
      const { manifest, all } = await this.sessionBultos(manager, session)
      const bulto = await manager.findOne(Bulto, { where: { codigo: dto.codigo } })
      if (!bulto) throw new NotFoundException({ statusCode: 404, code: 'BULTO_NOT_FOUND', message: 'El código no corresponde a un bulto GRAEL existente', details: { codigo: dto.codigo } })
      const isExpected = all.some(item => item.id === bulto.id)
      const requestedState = dto.estado || EstadoDesembarqueBulto.RECIBIDO
      if (!isExpected && requestedState !== EstadoDesembarqueBulto.EXTRA) throw new BadRequestException({ statusCode: 400, code: 'BULTO_NOT_IN_MANIFEST', message: 'Este bulto no estaba esperado en este manifiesto; confirme Registrar como EXTRA', details: { codigo: dto.codigo, manifiestoId: manifest.id } })
      if (!isExpected && bulto.sedeActualId && bulto.sedeActualId !== session.sedeId) throw new ForbiddenException({ statusCode: 403, code: 'EXTRA_CUSTODY_SITE_MISMATCH', message: 'El bulto extra no se encuentra en la sede de desembarque', details: { codigo: dto.codigo, sedeActualId: bulto.sedeActualId, sedeSesionId: session.sedeId } })
      const existing = await manager.findOne(DesembarqueBulto, { where: { sesionId: session.id, bultoId: bulto.id } })
      if (existing) return { registro: existing, alreadyScanned: true, message: 'Bulto ya escaneado; no se duplicó el contador' }
      const operador = await manager.findOneBy(Usuario, { id: user.sub })
      if (!operador) throw new NotFoundException('Usuario operador no encontrado')
      const registro = manager.create(DesembarqueBulto, { sesion: session, sesionId: session.id, bulto, bultoId: bulto.id, estado: requestedState, observacion: dto.observacion, usuario: operador, usuarioId: operador.id })
      const saved = await manager.save(DesembarqueBulto, registro)
      if (!isExpected) {
        const incidencia = await manager.save(Incidencia, manager.create(Incidencia, { ticketId: bulto.ticketId, bultoId: bulto.id, tipo: TipoIncidencia.BULTO_EXTRA, estado: EstadoIncidencia.ABIERTA, descripcion: `Bulto extra detectado en desembarque ${manifest.codigo}`, evidencia: { sesionId: session.id, manifiestoId: manifest.id, codigo: bulto.codigo }, sedeId: session.sedeId, almacenId: session.almacenDestinoId, usuarioId: operador.id }))
        await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: bulto.ticketId, bultoId: bulto.id, tipoEvento: TipoTrackingEvento.OBSERVADO, sedeId: session.sedeId, almacenId: session.almacenDestinoId, ubicacionId: session.ubicacionDestinoId, usuarioId: operador.id, observacion: dto.observacion || 'Bulto válido no esperado en el manifiesto', metadata: { sesionId: session.id, manifiestoId: manifest.id, estado: requestedState, incidenciaId: incidencia.id } }))
        await manager.save(AuditLog, manager.create(AuditLog, { usuarioId: operador.id, accion: 'DESEMBARQUE_EXTRA', entidad: 'Bulto', entidadId: bulto.id, antes: { estado: bulto.estado, sedeActualId: bulto.sedeActualId }, despues: { registroId: saved.id, estado: requestedState }, metadata: { sesionId: session.id, manifiestoId: manifest.id, incidenciaId: incidencia.id } }))
        return { registro: saved, bulto, alreadyScanned: false, extra: true, message: 'Este bulto no estaba esperado en este manifiesto; se registró como EXTRA' }
      }
      const before = { estado: bulto.estado, sedeActualId: bulto.sedeActualId, almacenActualId: bulto.almacenActualId, ubicacionActualId: bulto.ubicacionActualId }
      bulto.estado = requestedState === EstadoDesembarqueBulto.DANADO ? EstadoBulto.OBSERVADO : EstadoBulto.DESEMBARCADO
      bulto.sedeActualId = session.sedeId; bulto.almacenActualId = session.almacenDestinoId; bulto.ubicacionActualId = session.ubicacionDestinoId
      await manager.save(Bulto, bulto)
      await manager.save(MovimientoAlmacen, manager.create(MovimientoAlmacen, { bultoId: bulto.id, sedeId: session.sedeId, almacenOrigenId: before.almacenActualId, ubicacionOrigenId: before.ubicacionActualId, almacenDestinoId: session.almacenDestinoId, ubicacionDestinoId: session.ubicacionDestinoId, usuarioId: operador.id, tipo: TipoMovimientoAlmacen.INGRESO_DESEMBARQUE, referenciaTipo: 'DESEMBARQUE_SESION', referenciaId: session.id, motivo: dto.observacion || 'Ingreso físico por desembarque' }))
      const tracking = await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: bulto.ticketId, bultoId: bulto.id, tipoEvento: requestedState === EstadoDesembarqueBulto.DANADO ? TipoTrackingEvento.OBSERVADO : TipoTrackingEvento.DESEMBARCADO, sedeId: session.sedeId, almacenId: session.almacenDestinoId, ubicacionId: session.ubicacionDestinoId, usuarioId: operador.id, observacion: dto.observacion || 'Desembarque físico por escaneo', metadata: { sesionId: session.id, estado: requestedState, movimientoAlmacen: TipoMovimientoAlmacen.INGRESO_DESEMBARQUE } }))
      if (requestedState === EstadoDesembarqueBulto.DANADO) await manager.save(Incidencia, manager.create(Incidencia, { ticketId: bulto.ticketId, bultoId: bulto.id, tipo: TipoIncidencia.DANADO, estado: EstadoIncidencia.ABIERTA, descripcion: 'Bulto marcado como dañado durante desembarque físico', evidencia: { sesionId: session.id, observacion: dto.observacion || null }, sedeId: session.sedeId, almacenId: session.almacenDestinoId, usuarioId: operador.id }))
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId: operador.id, accion: 'DESEMBARQUE_SCAN', entidad: 'Bulto', entidadId: bulto.id, antes: before, despues: { estado: bulto.estado, sedeActualId: bulto.sedeActualId, almacenActualId: bulto.almacenActualId, ubicacionActualId: bulto.ubicacionActualId }, metadata: { sesionId: session.id, trackingId: tracking.id, estado: requestedState } }))
      return { registro: saved, bulto, alreadyScanned: false }
    })
  }

  async cerrarSesion(id: string, motivo?: string, user?: any) {
    if (!user?.sub) throw new ForbiddenException({ statusCode: 403, code: 'ACTOR_REQUIRED', message: 'El cierre requiere usuario autenticado' })
    return this.dataSource.transaction(async manager => {
      const session = await this.loadSession(manager, id, user)
      if (session.estado !== EstadoDesembarqueSesion.ABIERTA) return session
      const { all } = await this.sessionBultos(manager, session)
      const scanned = await manager.find(DesembarqueBulto, { where: { sesionId: session.id } })
      const scannedIds = new Set(scanned.map(item => item.bultoId))
      const pendingBultos = all.filter(item => !scannedIds.has(item.id))
      const pending = pendingBultos.length
      const authorizedDifference = [RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE].includes(user.rol as RolUsuario)
      if (pending > 0 && (!authorizedDifference || !motivo?.trim())) throw new BadRequestException({ statusCode: 409, code: 'UNLOADING_DIFFERENCE_REQUIRES_AUTHORIZATION', message: 'El cierre con faltantes requiere rol autorizado y motivo', details: { expected: all.length, received: scanned.length, pending } })
      const operador = await manager.findOneBy(Usuario, { id: user.sub })
      for (const bulto of pendingBultos) {
        const registro = manager.create(DesembarqueBulto, { sesionId: session.id, bultoId: bulto.id, estado: EstadoDesembarqueBulto.FALTANTE, observacion: motivo?.trim() || 'Bulto no recibido al cierre del desembarque', usuarioId: operador?.id })
        await manager.save(DesembarqueBulto, registro)
        if (![EstadoBulto.ANULADO, EstadoBulto.ENTREGADO].includes(bulto.estado)) {
          bulto.estado = EstadoBulto.FALTANTE
          await manager.save(Bulto, bulto)
        }
        const incidencia = await manager.save(Incidencia, manager.create(Incidencia, { ticketId: bulto.ticketId, bultoId: bulto.id, tipo: TipoIncidencia.FALTANTE, estado: EstadoIncidencia.ABIERTA, descripcion: `Faltante detectado al cerrar desembarque ${session.id}`, evidencia: { sesionId: session.id, manifiestoId: session.manifiestoId, motivo: motivo?.trim() || null }, sedeId: session.sedeId, almacenId: session.almacenDestinoId, usuarioId: operador?.id }))
        await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: bulto.ticketId, bultoId: bulto.id, tipoEvento: TipoTrackingEvento.OBSERVADO, sedeId: session.sedeId, almacenId: session.almacenDestinoId, ubicacionId: session.ubicacionDestinoId, usuarioId: operador?.id, observacion: 'Bulto faltante detectado al cierre del desembarque', metadata: { sesionId: session.id, incidenciaId: incidencia.id, estado: EstadoDesembarqueBulto.FALTANTE } }))
      }
      session.estado = EstadoDesembarqueSesion.CERRADA; session.usuarioCierre = operador || undefined; session.usuarioCierreId = operador?.id; session.observacion = [session.observacion, motivo && `Cierre: ${motivo}`].filter(Boolean).join(' | ')
      const saved = await manager.save(DesembarqueSesion, session)
      return { session: saved, expected: all.length, received: scanned.length, pending, faltantesRegistrados: pending }
    })
  }
}
