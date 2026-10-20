import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Bulto, EstadoBulto } from '../database/entities/bulto.entity'
import { MovimientoAlmacen, TipoMovimientoAlmacen } from '../database/entities/movimiento-almacen.entity'
import { Almacen, UbicacionAlmacen } from '../database/entities/almacen.entity'
import { TrackingEvento, TipoTrackingEvento } from '../database/entities/tracking-evento.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { InventarioQueryDto, MovimientoInventarioQueryDto, MoverInventarioDto } from '../common/dto/inventario.dto'
import { assertSedeAccess, effectiveSedeId, isGlobalRole } from '../auth/sede-scope'

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Bulto) private readonly bultoRepo: Repository<Bulto>,
    @InjectRepository(MovimientoAlmacen) private readonly movimientoRepo: Repository<MovimientoAlmacen>,
    @InjectRepository(Almacen) private readonly almacenRepo: Repository<Almacen>,
    @InjectRepository(UbicacionAlmacen) private readonly ubicacionRepo: Repository<UbicacionAlmacen>,
    @InjectRepository(TrackingEvento) private readonly trackingRepo: Repository<TrackingEvento>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(query: InventarioQueryDto, user?: any) {
    if (query.sedeId) assertSedeAccess(user, query.sedeId, 'consultar inventario')
    const scopeSedeId = effectiveSedeId(user, query.sedeId)
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))
    const qb = this.bultoRepo.createQueryBuilder('b')
      .leftJoinAndSelect('b.ticket', 'ticket')
      .leftJoinAndSelect('ticket.origen', 'origen')
      .leftJoinAndSelect('ticket.destino', 'destino')
      .leftJoinAndSelect('ticket.remitente', 'remitente')
      .leftJoinAndSelect('ticket.destinatario', 'destinatario')
      .leftJoinAndSelect('b.almacenActual', 'almacen')
      .leftJoinAndSelect('b.ubicacionActual', 'ubicacion')
      .leftJoinAndSelect('b.sedeActual', 'sede')
      .orderBy('b.createdAt', 'DESC')
    if (scopeSedeId) qb.andWhere('b.sede_actual_id = :scopeSedeId', { scopeSedeId })
    if (query.estado) qb.andWhere('b.estado = :estado', { estado: query.estado })
    if (query.almacenId) qb.andWhere('b.almacen_actual_id = :almacenId', { almacenId: query.almacenId })
    if (query.ubicacionId) qb.andWhere('b.ubicacion_actual_id = :ubicacionId', { ubicacionId: query.ubicacionId })
    if (query.codigo) qb.andWhere('b.codigo ILIKE :codigo', { codigo: `%${query.codigo}%` })
    if (query.ticketId) qb.andWhere('b.ticket_id = :ticketId', { ticketId: query.ticketId })
    qb.skip((page - 1) * limit).take(limit)
    const [data, total] = await qb.getManyAndCount()
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async movimientos(query: MovimientoInventarioQueryDto, user?: any) {
    if (query.sedeId) assertSedeAccess(user, query.sedeId, 'consultar movimientos')
    const scopeSedeId = effectiveSedeId(user, query.sedeId)
    const qb = this.movimientoRepo.createQueryBuilder('movimiento')
      .leftJoinAndSelect('movimiento.bulto', 'bulto')
      .leftJoinAndSelect('movimiento.almacenOrigen', 'almacenOrigen')
      .leftJoinAndSelect('movimiento.ubicacionOrigen', 'ubicacionOrigen')
      .leftJoinAndSelect('movimiento.almacenDestino', 'almacenDestino')
      .leftJoinAndSelect('movimiento.ubicacionDestino', 'ubicacionDestino')
      .leftJoinAndSelect('movimiento.usuario', 'usuario')
      .orderBy('movimiento.createdAt', 'DESC')
      .take(Math.min(100, Math.max(1, Number(query.limit) || 50)))
    if (scopeSedeId) qb.andWhere('movimiento.sede_id = :scopeSedeId', { scopeSedeId })
    if (query.bultoId) qb.andWhere('movimiento.bulto_id = :bultoId', { bultoId: query.bultoId })
    return qb.getMany()
  }

  async mover(dto: MoverInventarioDto, usuarioId: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const bulto = await manager.findOne(Bulto, { where: { id: dto.bultoId }, relations: ['ticket'] })
      if (!bulto) throw new NotFoundException('Bulto no encontrado')
      const currentSedeId = bulto.sedeActualId
      if (!currentSedeId && !isGlobalRole(user)) throw new BadRequestException('El bulto no tiene sede actual')
      if (currentSedeId) assertSedeAccess(user, currentSedeId, 'mover el bulto')

      const destino = await manager.findOneBy(Almacen, { id: dto.almacenDestinoId })
      const ubicacion = await manager.findOneBy(UbicacionAlmacen, { id: dto.ubicacionDestinoId })
      if (!destino) throw new NotFoundException('Almacén destino no encontrado')
      if (!ubicacion) throw new NotFoundException('Ubicación destino no encontrada')
      if (ubicacion.almacenId !== destino.id) throw new BadRequestException('La ubicación no pertenece al almacén destino')
      if (destino.estado !== 'ACTIVO') throw new BadRequestException('El almacén destino no está activo')
      if (ubicacion.activo === false) throw new BadRequestException('La ubicación destino no está activa')
      assertSedeAccess(user, destino.sedeId, 'mover el bulto al almacén destino')
      if (currentSedeId && destino.sedeId !== currentSedeId) {
        throw new ForbiddenException({ statusCode: 403, code: 'CROSS_SITE_MOVEMENT_FORBIDDEN', message: 'El cambio de sede requiere manifiesto, transbordo o llegada', details: { currentSedeId, destinationSedeId: destino.sedeId } })
      }

      if ([EstadoBulto.ANULADO, EstadoBulto.ENTREGADO, EstadoBulto.EN_TRANSITO].includes(bulto.estado)) throw new BadRequestException(`El bulto no puede moverse desde estado ${bulto.estado}`)
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      if (usuarioId && !usuario) throw new NotFoundException('Usuario operador no encontrado')
      const sedeId = currentSedeId || destino.sedeId
      const tipo = dto.tipo || (bulto.estado === EstadoBulto.RECEPCIONADO ? TipoMovimientoAlmacen.INGRESO : TipoMovimientoAlmacen.TRANSFERENCIA)
      if (!Object.values(TipoMovimientoAlmacen).includes(tipo)) throw new BadRequestException('Tipo de movimiento inválido')
      const previous = { almacenId: bulto.almacenActualId, ubicacionId: bulto.ubicacionActualId, sedeId: bulto.sedeActualId }
      bulto.almacenActual = destino
      bulto.almacenActualId = destino.id
      bulto.ubicacionActual = ubicacion
      bulto.ubicacionActualId = ubicacion.id
      bulto.sedeActualId = sedeId
      bulto.estado = tipo === TipoMovimientoAlmacen.SALIDA ? EstadoBulto.LISTO_RECOJO : EstadoBulto.EN_ALMACEN
      const savedBulto = await manager.save(Bulto, bulto)
      const movimiento = await manager.save(MovimientoAlmacen, manager.create(MovimientoAlmacen, { bulto: savedBulto, bultoId: savedBulto.id, sedeId, almacenOrigenId: previous.almacenId, ubicacionOrigenId: previous.ubicacionId, almacenDestinoId: destino.id, ubicacionDestinoId: ubicacion.id, usuario: usuario || undefined, usuarioId: usuario?.id, tipo, referenciaTipo: dto.referenciaTipo, referenciaId: dto.referenciaId, motivo: dto.motivo }))
      await manager.save(TrackingEvento, manager.create(TrackingEvento, { ticketId: bulto.ticketId, bultoId: bulto.id, tipoEvento: TipoTrackingEvento.UBICADO, sedeId, almacenId: destino.id, ubicacionId: ubicacion.id, usuarioId: usuario?.id, observacion: dto.motivo || `Movimiento de almacén ${tipo}`, metadata: { movimientoId: movimiento.id, previous } }))
      return { bulto: savedBulto, movimiento }
    })
  }
}
