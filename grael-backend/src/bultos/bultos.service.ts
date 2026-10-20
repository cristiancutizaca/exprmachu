import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import * as QRCode from 'qrcode'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Bulto, EstadoBulto } from '../database/entities/bulto.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { TrackingEvento, TipoTrackingEvento } from '../database/entities/tracking-evento.entity'
import { Usuario, RolUsuario } from '../database/entities/usuario.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertSedeAccess, effectiveSedeId } from '../auth/sede-scope'

const transitions: Record<EstadoBulto, readonly EstadoBulto[]> = {
  [EstadoBulto.RECEPCIONADO]: [EstadoBulto.EN_ALMACEN, EstadoBulto.ANULADO],
  [EstadoBulto.EN_ALMACEN]: [EstadoBulto.PROGRAMADO, EstadoBulto.OBSERVADO, EstadoBulto.FALTANTE, EstadoBulto.ANULADO],
  [EstadoBulto.PROGRAMADO]: [EstadoBulto.CARGADO, EstadoBulto.ANULADO],
  [EstadoBulto.CARGADO]: [EstadoBulto.EN_TRANSITO, EstadoBulto.OBSERVADO],
  [EstadoBulto.EN_TRANSITO]: [EstadoBulto.TRANSBORDO, EstadoBulto.LLEGADO, EstadoBulto.OBSERVADO],
  [EstadoBulto.TRANSBORDO]: [EstadoBulto.EN_TRANSITO, EstadoBulto.OBSERVADO],
  [EstadoBulto.LLEGADO]: [EstadoBulto.DESEMBARCADO, EstadoBulto.OBSERVADO],
  [EstadoBulto.DESEMBARCADO]: [EstadoBulto.LISTO_RECOJO, EstadoBulto.EN_REPARTO, EstadoBulto.OBSERVADO],
  [EstadoBulto.LISTO_RECOJO]: [EstadoBulto.ENTREGADO, EstadoBulto.DEVUELTO],
  [EstadoBulto.EN_REPARTO]: [EstadoBulto.ENTREGADO, EstadoBulto.DEVUELTO, EstadoBulto.OBSERVADO],
  [EstadoBulto.ENTREGADO]: [],
  [EstadoBulto.OBSERVADO]: [EstadoBulto.EN_ALMACEN, EstadoBulto.DEVUELTO],
  [EstadoBulto.FALTANTE]: [EstadoBulto.OBSERVADO, EstadoBulto.DEVUELTO],
  [EstadoBulto.DEVUELTO]: [],
  [EstadoBulto.ANULADO]: [],
}

@Injectable()
export class BultosService {
  constructor(
    @InjectRepository(Bulto) private readonly bultoRepo: Repository<Bulto>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TrackingEvento) private readonly trackingRepo: Repository<TrackingEvento>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(query: any, user?: any) {
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
    const qb = this.bultoRepo.createQueryBuilder('b')
      .leftJoinAndSelect('b.ticket', 'ticket')
      .leftJoinAndSelect('b.sedeActual', 'sede')
      .leftJoinAndSelect('b.almacenActual', 'almacen')
      .leftJoinAndSelect('b.ubicacionActual', 'ubicacion')
      .leftJoin('ticket.usuarioCreacion', 'creator')
      .orderBy('b.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
    const scopeSedeId = effectiveSedeId(user, query.sedeId)
    if (scopeSedeId) qb.andWhere('(b.sede_actual_id = :scopeSedeId OR (b.sede_actual_id IS NULL AND creator.sede_id = :scopeSedeId))', { scopeSedeId })
    if (query.sedeId && scopeSedeId !== query.sedeId) assertSedeAccess(user, query.sedeId, 'consultar bultos')
    if (query.ticketId) qb.andWhere('b.ticketId = :ticketId', { ticketId: query.ticketId })
    if (query.codigo) qb.andWhere('b.codigo ILIKE :codigo', { codigo: `%${query.codigo}%` })
    if (query.estado) qb.andWhere('b.estado = :estado', { estado: query.estado })
    const [data, total] = await qb.getManyAndCount()
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async crear(dto: any, usuarioId?: string, user?: any) {
    if (user) {
      const creatorTicket = await this.ticketRepo.findOne({ where: { id: dto.ticketId }, relations: ['usuarioCreacion'] })
      if (!creatorTicket) throw new NotFoundException('Ticket no encontrado')
      assertSedeAccess(user, creatorTicket.usuarioCreacion?.sedeId, 'crear bultos')
    }
    return this.dataSource.transaction(async manager => {
      const ticket = await manager.findOne(Ticket, { where: { id: dto.ticketId }, relations: ['sedeRecepcion', 'usuarioCreacion'] })
      if (!ticket) throw new NotFoundException('Ticket no encontrado')
      if (ticket.anulado) throw new BadRequestException('No se pueden crear bultos en un ticket anulado')
      const numero = Number(dto.numero || 1)
      const codigo = dto.codigo || `${ticket.numeroTicket}-${String(numero).padStart(3, '0')}`
      const exists = await manager.findOneBy(Bulto, { codigo })
      if (exists) throw new BadRequestException('El código de bulto ya existe')
      if (dto.estado && dto.estado !== EstadoBulto.RECEPCIONADO) throw new BadRequestException('El estado inicial del bulto debe ser RECEPCIONADO')
      const allowed = ['tipo', 'descripcion', 'cantidad', 'pesoReal', 'pesoVolumetrico', 'alto', 'ancho', 'largo', 'volumen', 'valorDeclarado', 'fragil', 'requiereCuidado', 'codigoBarras', 'observaciones']
      const safePayload = Object.fromEntries(allowed.filter(field => dto[field] !== undefined).map(field => [field, dto[field]]))
      const bulto = manager.create(Bulto, {
        ...safePayload,
        ticketId: ticket.id,
        codigo,
        numero,
        estado: EstadoBulto.RECEPCIONADO,
        sedeActualId: ticket.sedeRecepcionId || ticket.usuarioCreacion?.sedeId,
        qrPayload: `GRAEL|BULTO|${codigo}|TICKET|${ticket.numeroTicket}`,
      })
      const saved = await manager.save(Bulto, bulto)
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      await manager.save(TrackingEvento, manager.create(TrackingEvento, {
        ticketId: ticket.id,
        bultoId: saved.id,
        tipoEvento: TipoTrackingEvento.RECEPCIONADO,
        usuarioId: usuario?.id,
        observacion: 'Bulto creado en recepción',
        metadata: { codigo: saved.codigo, numero: saved.numero },
      }))
      return manager.findOne(Bulto, { where: { id: saved.id }, relations: ['ticket', 'sedeActual', 'almacenActual', 'ubicacionActual'] })
    })
  }

  async cambiarEstado(id: string, estado: EstadoBulto, usuarioId?: string, observacion?: string, user?: any, legacy = false, motivo?: string) {
    if (user && (!legacy || String(motivo || '').trim().length < 5 || ![RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN].includes(user.rol))) {
      throw new BadRequestException({ statusCode: 409, code: 'DIRECT_BULTO_STATE_FORBIDDEN', message: 'El cambio directo de estado está deprecado; use el workflow operativo o una corrección administrativa autorizada', details: { legacyRequired: true } })
    }
    if (legacy) {
      if (!user) throw new ForbiddenException({ statusCode: 403, code: 'LEGACY_OPERATION_FORBIDDEN', message: 'La ruta legacy requiere una corrección administrativa autenticada', details: {} })
      return this.corregirEstado(id, estado, motivo || '', user)
    }
    if (user) {
      const scopedBulto = await this.bultoRepo.findOne({ where: { id }, relations: ['ticket', 'ticket.usuarioCreacion'] })
      if (!scopedBulto) throw new NotFoundException('Bulto no encontrado')
      assertSedeAccess(user, scopedBulto.sedeActualId || scopedBulto.ticket?.usuarioCreacion?.sedeId, 'cambiar estados de bultos')
    }
    return this.dataSource.transaction(async manager => {
      const bulto = await manager.findOneBy(Bulto, { id })
      if (!bulto) throw new NotFoundException('Bulto no encontrado')
      if (bulto.estado !== estado && !transitions[bulto.estado]?.includes(estado)) {
        throw new BadRequestException({ statusCode: 400, code: 'BULTO_INVALID_STATE', message: `El bulto no puede pasar de ${bulto.estado} a ${estado}`, details: { from: bulto.estado, to: estado } })
      }
      bulto.estado = estado
      const saved = await manager.save(Bulto, bulto)
      const usuario = usuarioId ? await manager.findOneBy(Usuario, { id: usuarioId }) : null
      const eventByState: Partial<Record<EstadoBulto, TipoTrackingEvento>> = {
        EN_ALMACEN: TipoTrackingEvento.INGRESO_ALMACEN,
        CARGADO: TipoTrackingEvento.CARGADO,
        EN_TRANSITO: TipoTrackingEvento.EN_TRANSITO,
        TRANSBORDO: TipoTrackingEvento.TRANSBORDO_INICIADO,
        LLEGADO: TipoTrackingEvento.LLEGADA_SEDE,
        DESEMBARCADO: TipoTrackingEvento.DESEMBARCADO,
        LISTO_RECOJO: TipoTrackingEvento.LISTO_RECOJO,
        EN_REPARTO: TipoTrackingEvento.SALIDA_REPARTO,
        ENTREGADO: TipoTrackingEvento.ENTREGADO,
        OBSERVADO: TipoTrackingEvento.OBSERVADO,
        FALTANTE: TipoTrackingEvento.OBSERVADO,
        DEVUELTO: TipoTrackingEvento.DEVUELTO,
        ANULADO: TipoTrackingEvento.ANULADO,
      }
      await manager.save(TrackingEvento, manager.create(TrackingEvento, {
        ticketId: saved.ticketId, bultoId: saved.id, tipoEvento: eventByState[estado] || TipoTrackingEvento.UBICADO,
        usuarioId: usuario?.id, observacion,
      }))
      return saved
    })
  }

  async corregirEstado(id: string, estadoDestino: EstadoBulto, motivo: string, user: any) {
    if (!user || ![RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN].includes(user.rol)) {
      throw new ForbiddenException({ statusCode: 403, code: 'ADMIN_STATE_CORRECTION_FORBIDDEN', message: 'Solo SUPERVISOR o SUPERADMIN pueden corregir administrativamente el estado de un bulto', details: {} })
    }
    if (String(motivo || '').trim().length < 5) {
      throw new BadRequestException({ statusCode: 400, code: 'CORRECTION_REASON_REQUIRED', message: 'La corrección administrativa requiere un motivo de al menos 5 caracteres', details: {} })
    }
    return this.dataSource.transaction(async manager => {
      const bulto = await manager.findOne(Bulto, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!bulto) throw new NotFoundException('Bulto no encontrado')
      const ticket = await manager.findOne(Ticket, { where: { id: bulto.ticketId }, relations: ['sedeRecepcion', 'usuarioCreacion'] })
      assertSedeAccess(user, bulto.sedeActualId || ticket?.sedeRecepcionId || ticket?.usuarioCreacion?.sedeId, 'corregir administrativamente el bulto')
      const anterior = bulto.estado
      bulto.estado = estadoDestino
      const saved = await manager.save(Bulto, bulto)
      await manager.save(AuditLog, manager.create(AuditLog, {
        usuarioId: user.sub, accion: 'CORRECCION_ADMINISTRATIVA', entidad: 'Bulto', entidadId: id,
        antes: { estado: anterior }, despues: { estado: estadoDestino }, metadata: { motivo, sinEventoFisico: true },
      }))
      return saved
    })
  }

  async etiqueta(id: string, user?: any) {
    const bulto = await this.bultoRepo.findOne({ where: { id }, relations: ['ticket', 'ticket.origen', 'ticket.destino', 'ticket.destinatario', 'ticket.usuarioCreacion'] })
    if (!bulto) throw new NotFoundException('Bulto no encontrado')
    assertSedeAccess(user, bulto.sedeActualId || bulto.ticket?.usuarioCreacion?.sedeId, 'consultar etiquetas')
    const ticket: any = bulto.ticket
    const esc = (value: unknown) => String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char] || char))
    const qrPayload = `GRAEL:BULTO:${bulto.codigo}`
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 260, margin: 1, errorCorrectionLevel: 'M' })
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiqueta ${esc(bulto.codigo)}</title><style>@page{size:100mm 70mm;margin:0}body{font-family:Arial,sans-serif;width:96mm;margin:5mm;color:#172554;font-size:11px}.head{display:flex;justify-content:space-between;border-bottom:2px solid #173b78;padding-bottom:5px}.brand{font-size:18px;font-weight:800}.code{font-size:16px;font-weight:800}.route{font-size:15px;font-weight:700;margin:8px 0}.box{border:1px solid #cbd5e1;border-radius:4px;padding:6px;margin-top:6px}.label{display:flex;gap:8px;align-items:center;margin-top:7px}.qr{width:32mm;height:32mm;image-rendering:pixelated}.muted{color:#64748b;font-size:10px}.payload{font-size:9px;color:#64748b;word-break:break-all}</style></head><body><div class="head"><div><div class="brand">GRAEL</div><div class="muted">Etiqueta de bulto</div></div><div class="code">${esc(bulto.codigo)}</div></div><div class="route">${esc(ticket?.origen?.nombre)} → ${esc(ticket?.destino?.nombre)}</div><div class="box"><strong>Ticket:</strong> ${esc(ticket?.numeroTicket)}<br><strong>Bulto:</strong> ${esc(bulto.numero)}<br><strong>Destinatario:</strong> ${esc(ticket?.destinatario?.razonSocial)}<br><strong>Peso:</strong> ${esc(bulto.pesoReal || '-')} kg</div><div class="label"><img class="qr" src="${qrDataUrl}" alt="Código QR del bulto"/><div><strong>QR</strong><div class="payload">${esc(qrPayload)}</div><div class="muted">Escanee para consultar el bulto</div></div></div><script>window.onload=()=>window.print()</script></body></html>`
  }
}
