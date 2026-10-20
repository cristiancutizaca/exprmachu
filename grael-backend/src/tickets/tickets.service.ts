import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import * as QRCode from 'qrcode'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource, Between } from 'typeorm'
import { Ticket, EstadoTicket } from '../database/entities/ticket.entity'
import { GuiaRemision, MercaderiaItem } from '../database/entities/mercaderia-item.entity'
import { Pago, MetodoPago }    from '../database/entities/operaciones.entity'
import { Destino }    from '../database/entities/destino.entity'
import { Cliente }    from '../database/entities/cliente.entity'
import { Programacion } from '../database/entities/programacion.entity'
import { Usuario }    from '../database/entities/usuario.entity'
import { Sede }       from '../database/entities/sede.entity'
import { TicketWorkflowService } from './ticket-workflow.service'
import { Bulto, EstadoBulto } from '../database/entities/bulto.entity'
import { TrackingEvento, TipoTrackingEvento } from '../database/entities/tracking-evento.entity'
import { Tarifa } from '../database/entities/tarifa.entity'
import { Configuracion } from '../database/entities/configuracion.entity'
import { AuditLog }       from '../database/entities/audit-log.entity'
import { CajaSesion, EstadoCajaSesion, MovimientoCaja, TipoMovimientoCaja } from '../database/entities/caja.entity'
import { assertSedeAccess, assertReceptionSedeAccess, assertPaymentSedeAccess, effectiveSedeId, isGlobalRole } from '../auth/sede-scope'
import { TicketAccessPolicy } from '../auth/ticket-access-policy'

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)         private ticketRepo: Repository<Ticket>,
    @InjectRepository(GuiaRemision)   private guiaRepo:   Repository<GuiaRemision>,
    @InjectRepository(MercaderiaItem) private mercRepo:   Repository<MercaderiaItem>,
    @InjectRepository(Pago)           private pagoRepo:   Repository<Pago>,
    @InjectRepository(Destino)        private destRepo:   Repository<Destino>,
    @InjectRepository(Cliente)        private clienteRepo:Repository<Cliente>,
    @InjectRepository(Programacion)   private progRepo:   Repository<Programacion>,
    @InjectRepository(Tarifa)         private tarifaRepo: Repository<Tarifa>,
    @InjectRepository(Configuracion)  private configRepo: Repository<Configuracion>,
    @InjectRepository(AuditLog)       private auditRepo: Repository<AuditLog>,
    @InjectRepository(CajaSesion)      private cajaRepo: Repository<CajaSesion>,
    private dataSource: DataSource,
    private workflow: TicketWorkflowService,
  ) {}

  async findAll(filtros: any, user?: any) {
    const page = Math.max(1, parseInt(filtros.page) || 1)
    const maxLimit = filtros.__export ? 5000 : 100
    const limit = Math.min(maxLimit, parseInt(filtros.limit) || 20)
    const qb = this.ticketRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.origen',       'origen')
      .leftJoinAndSelect('t.destino',      'destino')
      .leftJoinAndSelect('t.remitente',    'rem')
      .leftJoinAndSelect('t.destinatario', 'des')
      .leftJoinAndSelect('t.guiasRemision','guias')
      .leftJoinAndSelect('t.mercaderias',  'mercs')
      .leftJoinAndSelect('t.bultos',       'bultos')
      .leftJoin('t.usuarioCreacion', 'creator')
      .leftJoin('t.sedeRecepcion', 'receptionSede')
      .leftJoin('destino.sede', 'destinoSede')

    const scopeSedeId = effectiveSedeId(user, filtros.sedeId)
    if (scopeSedeId) {
      qb.andWhere(`(t.sede_recepcion_id = :scopeSedeId OR (t.sede_recepcion_id IS NULL AND creator.sede_id = :scopeSedeId) OR bultos.sede_actual_id = :scopeSedeId OR (t.estado IN (:...inboundStates) AND destinoSede.id = :scopeSedeId))`, { scopeSedeId, inboundStates: [EstadoTicket.PENDIENTE, EstadoTicket.EN_TRANSITO, EstadoTicket.DESEMBARQUE_EN_DESTINO, EstadoTicket.LISTO_REPARTO] })
      qb.distinct(true)
    }
    if (!isGlobalRole(user) && filtros.sedeId && scopeSedeId !== filtros.sedeId) assertSedeAccess(user, filtros.sedeId, 'consultar')

    if (filtros.numeroTicket) qb.andWhere('t.numeroTicket ILIKE :nt', { nt:`%${filtros.numeroTicket}%` })
    if (filtros.dniRuc) qb.andWhere('(rem.ruc ILIKE :dr OR rem.dni ILIKE :dr OR des.ruc ILIKE :dr OR des.dni ILIKE :dr)', { dr:`%${filtros.dniRuc}%` })
    if (filtros.origenId) qb.andWhere('(t.origenId = :oid OR origen.nombre ILIKE :origenNombre)', { oid:filtros.origenId, origenNombre:`%${filtros.origenId}%` })
    if (filtros.destinoId) qb.andWhere('(t.destinoId = :did OR destino.nombre ILIKE :destinoNombre)', { did:filtros.destinoId, destinoNombre:`%${filtros.destinoId}%` })
    if (filtros.tipoEntrega) qb.andWhere('t.tipoEntrega = :te', { te:filtros.tipoEntrega })
    if (filtros.estado)      qb.andWhere('t.estado       = :es', { es:filtros.estado })
    if (filtros.pagado !== undefined && filtros.pagado !== '') qb.andWhere('t.pagado = :pa', { pa: filtros.pagado === 'true' })
    if (filtros.anulado !== undefined && filtros.anulado !== '') qb.andWhere('t.anulado = :an', { an: filtros.anulado === 'true' })
    if (filtros.fechaInicio && filtros.fechaFin) {
      qb.andWhere('t.fechaEmision BETWEEN :fi AND :ff', {
        fi: new Date(filtros.fechaInicio), ff: new Date(filtros.fechaFin + 'T23:59:59')
      })
    }
    const guia = filtros.guiaRemisionRemitente || filtros.guiaRemision
    if (guia) qb.andWhere('guias.codigo ILIKE :gr', { gr:`%${guia}%` })

    qb.orderBy('t.fechaEmision', 'DESC').skip((page-1)*limit).take(limit)
    const [data, total] = await qb.getManyAndCount()
    return { data, total, page, limit, totalPages: Math.ceil(total/limit) }
  }

  async findOne(id: string, user?: any) {
    const t = await this.ticketRepo.findOne({
      where: { id },
      relations: ['origen','destino','remitente','destinatario','programacion','guiasRemision','mercaderias','bultos','usuarioCreacion','sedeRecepcion'],
    })
    if (!t) throw new NotFoundException(`Ticket ${id} no encontrado`)
    TicketAccessPolicy.assertRead(user, t)
    return t
  }

  private async assertTicketAccess(id: string, user?: any) {
    if (!user) return
    const ticket = await this.ticketRepo.findOne({ where: { id }, relations: ['usuarioCreacion', 'sedeRecepcion', 'destino', 'bultos'] })
    if (!ticket) throw new NotFoundException(`Ticket ${id} no encontrado`)
    TicketAccessPolicy.assertEditReception(user, ticket)
  }

  async crear(dto: any, usuarioId: string, user?: any) {
    return this.dataSource.transaction(async manager => {
      const serie = String(dto.serie || '301').replace(/[^0-9A-Z-]/gi, '').slice(0, 10) || '301'
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`grael:ticket:${serie}`])
      const last = await manager.createQueryBuilder(Ticket, 'ticket')
        .where('ticket.numeroTicket LIKE :prefix', { prefix: `${serie}-%` })
        .orderBy('ticket.numeroTicket', 'DESC')
        .getOne()
      const lastNumber = last ? Number(String(last.numeroTicket).split('-').pop()) : 631000
      const numeroTicket = `${serie}-${String(lastNumber + 1).padStart(7, '0')}`

      const origen    = await manager.findOneByOrFail(Destino, { id: dto.origenId })
      const destino   = await manager.findOneByOrFail(Destino, { id: dto.destinoId })
      const remitente = await manager.findOneByOrFail(Cliente, { id: dto.remitenteId })
      const destinat  = await manager.findOneByOrFail(Cliente, { id: dto.destinatarioId })
      const usuario   = await manager.findOneByOrFail(Usuario, { id: usuarioId })
      const sedeRecepcionId = dto.sedeRecepcionId || usuario.sedeId
      if (!sedeRecepcionId) throw new BadRequestException({ statusCode: 400, code: 'RECEPTION_SITE_REQUIRED', message: 'La recepción requiere una sede operativa', details: {} })
      if (user) assertReceptionSedeAccess(user, sedeRecepcionId, 'crear el ticket en la sede de recepción')
      const sedeRecepcion = await manager.findOneBy(Sede, { id: sedeRecepcionId })
      if (!sedeRecepcion) throw new NotFoundException('Sede de recepción no encontrada')
      const prog      = dto.programacionId ? await manager.findOneBy(Programacion, { id: dto.programacionId }) : null

      const mercs: any[] = Array.isArray(dto.mercaderias) ? dto.mercaderias : []
      if (mercs.length === 0) throw new BadRequestException({ statusCode: 400, code: 'TICKET_EMPTY_CARGO', message: 'La recepción debe contener al menos una mercadería', details: {} })
      const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
      const normalizeKey = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      const igvConfig = await manager.findOneBy(Configuracion, { clave: 'sistema.igv' })
      const igvRate = Number(igvConfig?.valor || 18)
      const normalizedMercs: any[] = []
      const manualTariffItems: any[] = []
      for (const item of mercs) {
        const tipo = String(item.tipo || 'CARGA GENERAL')
        const tariff = await manager.createQueryBuilder(Tarifa, 'tarifa')
          .where('tarifa.origen_id = :origenId', { origenId: origen.id })
          .andWhere('tarifa.destino_id = :destinoId', { destinoId: destino.id })
          .andWhere('LOWER(tarifa.tipo_mercaderia) = LOWER(:tipo)', { tipo })
          .andWhere('tarifa.activo = true')
          .andWhere('tarifa.vigencia_desde <= CURRENT_DATE')
          .andWhere('(tarifa.vigencia_hasta IS NULL OR tarifa.vigencia_hasta >= CURRENT_DATE)')
          .orderBy('tarifa.vigencia_desde', 'DESC')
          .getOne()
        const config = await manager.findOneBy(Configuracion, { clave: `tarifa.${normalizeKey(tipo)}` })
        const configuredPrice = Number(tariff?.precioKg ?? config?.valor ?? 0)
        const manualRequested = Boolean(dto.tarifaManual)
        const manualAuthorized = manualRequested && ['ADMIN_SEDE', 'SUPERVISOR'].includes(String(usuario.rol)) && String(dto.motivoTarifaManual || '').trim().length >= 5 && Number(item.costoKg) > 0
        if (manualRequested && !manualAuthorized) throw new BadRequestException({ statusCode: 403, code: 'MANUAL_TARIFF_NOT_AUTHORIZED', message: 'La tarifa manual requiere rol autorizado, precio positivo y motivo', details: { tipo } })
        const precioKg = manualAuthorized ? Number(item.costoKg) : configuredPrice
        if (precioKg <= 0 && Number(tariff?.precioMinimo || 0) <= 0) throw new BadRequestException({ statusCode: 400, code: 'TARIFF_NOT_CONFIGURED', message: `No existe tarifa configurada para ${tipo} en la ruta seleccionada`, details: { tipo, origenId: origen.id, destinoId: destino.id } })
        if (manualAuthorized) manualTariffItems.push({ tipo, precioKg, motivo: dto.motivoTarifaManual, usuarioAutoriza: usuario.id })
        const peso = Number(item.pesoTotal || 0)
        if (peso <= 0) throw new BadRequestException({ statusCode: 400, code: 'CARGO_WEIGHT_REQUIRED', message: `El peso de ${tipo} debe ser mayor que cero`, details: { tipo } })
        const base = Math.max(Number(tariff?.precioMinimo || 0), peso * precioKg)
        const recargoReparto = dto.tipoEntrega === 'REPARTO' ? Number(tariff?.recargoReparto || 0) : 0
        const recargoFragil = item.fragil ? Number(tariff?.recargoFragil || 0) : 0
        const subtotalItem = round(base + recargoReparto + recargoFragil)
        const igvItem = round(subtotalItem * igvRate / 100)
        normalizedMercs.push({ ...item, tipo, costoKg: precioKg, subTotal: subtotalItem, igv: igvItem, total: round(subtotalItem + igvItem), esPesoVolumen: Boolean(item.esPesoVolumen) })
      }
      const subTotal = round(normalizedMercs.reduce((sum, item) => sum + Number(item.subTotal || 0), 0))
      const igv = round(normalizedMercs.reduce((sum, item) => sum + Number(item.igv || 0), 0))
      const total = round(normalizedMercs.reduce((sum, item) => sum + Number(item.total || 0), 0))

      const ticket = manager.create(Ticket, {
        numeroTicket, fechaViaje: new Date(dto.fechaViaje),
        tipoEntrega: dto.tipoEntrega, tipoPago: dto.tipoPago,
        origen, destino, remitente, destinatario: destinat, programacion: prog,
        sedeRecepcion, sedeRecepcionId,
        atencion1: dto.atencion1||'', atencion2: dto.atencion2||'',
        subTotal, igv, total, usuarioCreacion: usuario,
      })
      const saved = await manager.save(Ticket, ticket)

      for (const g of (dto.guiasRemision||[])) await manager.save(GuiaRemision, manager.create(GuiaRemision, { codigo:g.codigo, ticketId:saved.id }))
      for (const m of normalizedMercs) await manager.save(MercaderiaItem, manager.create(MercaderiaItem, { ...m, ticketId:saved.id }))

      const explicitBultos: any[] = Array.isArray(dto.bultos) ? dto.bultos : []
      const inferredCount = Math.max(1, Number(dto.numeroBultos || normalizedMercs.reduce((sum, item) => sum + Math.max(1, Number(item.numeroBultos || 1)), 0)))
      const bultos = explicitBultos.length ? explicitBultos : Array.from({ length: inferredCount }, (_, index) => {
        const item = normalizedMercs[index % Math.max(1, normalizedMercs.length)] || {}
        return { numero: index + 1, tipo: item.tipo || 'CARGA GENERAL', descripcion: item.descripcion, pesoReal: explicitBultos.length ? undefined : (Number(item.pesoTotal || 0) / inferredCount) }
      })
      for (const input of bultos) {
        const numero = Number(input.numero || 1)
        const codigo = input.codigo || `${saved.numeroTicket}-${String(numero).padStart(3, '0')}`
        const bulto = await manager.save(Bulto, manager.create(Bulto, {
          ...input, ticketId: saved.id, codigo, numero, cantidad: Number(input.cantidad || 1), sedeActualId: sedeRecepcionId,
          estado: input.estado || EstadoBulto.RECEPCIONADO,
          qrPayload: input.qrPayload || `GRAEL|BULTO|${codigo}`,
        }))
        await manager.save(TrackingEvento, manager.create(TrackingEvento, {
          ticketId: saved.id, bultoId: bulto.id, tipoEvento: TipoTrackingEvento.RECEPCIONADO,
          usuarioId: usuario.id, observacion: 'Bulto creado en recepción', metadata: { codigo, numero },
        }))
      }
      await manager.save(AuditLog, manager.create(AuditLog, {
        usuarioId: usuario.id, accion: 'CREATE', entidad: 'Ticket', entidadId: saved.id,
        despues: { numeroTicket: saved.numeroTicket, total: saved.total, bultos: bultos.length }, metadata: { source: 'recepcion', tarifaManual: manualTariffItems.length > 0 },
      }))
      if (manualTariffItems.length > 0) {
        await manager.save(AuditLog, manager.create(AuditLog, {
          usuarioId: usuario.id, accion: 'MANUAL_TARIFF', entidad: 'Ticket', entidadId: saved.id,
          despues: { items: manualTariffItems }, metadata: { motivo: dto.motivoTarifaManual, usuarioAutoriza: usuario.id },
        }))
      }

      return manager.findOne(Ticket, { where: { id: saved.id }, relations: ['origen','destino','remitente','destinatario','programacion','guiasRemision','mercaderias','bultos','usuarioCreacion','sedeRecepcion'] })
    })
  }

  async update(id: string, dto: any, user?: any) {
    const ticket = await this.findOne(id, user)
    if (user) TicketAccessPolicy.assertEditReception(user, ticket)
    const protectedFields = ['total', 'subTotal', 'igv', 'pagado', 'montoPagado', 'saldo', 'anulado', 'estado', 'createdBy', 'usuarioCreacionId']
    const attemptedProtected = protectedFields.filter(field => dto?.[field] !== undefined)
    if (attemptedProtected.length > 0) throw new BadRequestException({ statusCode: 400, code: 'TICKET_FIELD_PROTECTED', message: 'Los campos económicos, estado y auditoría solo se modifican mediante endpoints específicos', details: { fields: attemptedProtected } })
    const editable = ['fechaViaje', 'tipoEntrega', 'tipoPago', 'atencion1', 'atencion2', 'programacionId']
    const unknown = Object.keys(dto || {}).filter(key => !editable.includes(key))
    if (unknown.length > 0) throw new BadRequestException({ statusCode: 400, code: 'TICKET_FIELD_NOT_ALLOWED', message: 'El campo no está permitido para edición genérica', details: { fields: unknown } })
    for (const field of editable) if (dto[field] !== undefined) (ticket as any)[field] = dto[field]
    return this.ticketRepo.save(ticket)
  }

  async anular(id: string, motivo: string, usuarioId?: string, user?: any) {
    if (user) {
      const accessTicket = await this.ticketRepo.findOne({ where: { id }, relations: ['usuarioCreacion', 'sedeRecepcion'] })
      if (!accessTicket) throw new NotFoundException(`Ticket ${id} no encontrado`)
      TicketAccessPolicy.assertCancel(user, accessTicket)
    }
    return this.dataSource.transaction(async manager => {
      const ticket = await manager.findOne(Ticket, { where: { id } })
      if (!ticket) throw new NotFoundException(`Ticket ${id} no encontrado`)
      if (ticket.anulado) throw new BadRequestException('Ya fue anulado')
      const pagos = await manager.find(Pago, { where: { ticketId: id } })
      const montoPagado = pagos.reduce((sum, pago) => sum + Number(pago.monto || 0), 0)
      if (montoPagado > 0) throw new BadRequestException({ statusCode: 409, code: 'TICKET_HAS_PAYMENTS', message: 'No se puede anular directamente un ticket con pagos; requiere reverso o devolución autorizada', details: { montoPagado } })
      this.workflow.assertTransition(ticket.estado, EstadoTicket.ANULADO)
      const before = { estado: ticket.estado, anulado: ticket.anulado, pagado: ticket.pagado, montoPagado }
      ticket.anulado = true
      ticket.estado = EstadoTicket.ANULADO
      ticket.motivoAnulacion = motivo || 'Anulación autorizada'
      ticket.fechaAnulacion = new Date()
      const saved = await manager.save(Ticket, ticket)
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, accion: 'ANULAR', entidad: 'Ticket', entidadId: id, antes: before, despues: { estado: saved.estado, anulado: saved.anulado }, metadata: { motivo: ticket.motivoAnulacion } }))
      return manager.findOne(Ticket, { where: { id: saved.id }, relations: ['origen','destino','remitente','destinatario','mercaderias','guiasRemision','bultos'] })
    })
  }

  async pagar(id: string, metodoPago: string, usuarioId: string, montoSolicitado?: number, user?: any) {
    return this.dataSource.transaction(async manager => {
      const ticket = await manager.createQueryBuilder(Ticket, 'ticket')
        .where('ticket.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne()
      if (!ticket) throw new NotFoundException(`Ticket ${id} no encontrado`)
      if (ticket.anulado) throw new BadRequestException('Ticket anulado')
      const pagos = await manager.find(Pago, { where: { ticketId: ticket.id } })
      const pagadoAnterior = pagos.reduce((sum, pago) => sum + Number(pago.monto || 0), 0)
      const saldo = Math.max(0, Number(ticket.total || 0) - pagadoAnterior)
      if (saldo <= 0) throw new BadRequestException('El ticket ya está pagado')
      const monto = Number(montoSolicitado || saldo)
      if (!Number.isFinite(monto) || monto <= 0 || monto > saldo) throw new BadRequestException({ statusCode: 409, code: 'PAYMENT_EXCEEDS_BALANCE', message: 'El monto no puede superar el saldo pendiente', details: { saldo, monto } })
      const metodo = (metodoPago as MetodoPago) || MetodoPago.EFECTIVO
      if (!Object.values(MetodoPago).includes(metodo)) throw new BadRequestException({ statusCode: 400, code: 'PAYMENT_METHOD_INVALID', message: 'Método de pago inválido', details: { metodoPago } })
      const requiereCaja = [MetodoPago.EFECTIVO, MetodoPago.YAPE, MetodoPago.PLIN].includes(metodo)
      const usuario = await manager.findOneBy(Usuario, { id: usuarioId })
      if (!usuario) throw new NotFoundException('Usuario no encontrado')
      const caja = requiereCaja ? await manager.findOne(CajaSesion, { where: { usuarioAperturaId: usuarioId, estado: EstadoCajaSesion.ABIERTA }, lock: { mode: 'pessimistic_write' } }) : null
      if (requiereCaja && !caja) throw new BadRequestException({ statusCode: 409, code: 'CASH_SESSION_REQUIRED', message: 'Debe abrir una caja antes de registrar pagos en efectivo, Yape o Plin', details: { usuarioId, metodoPago: metodo } })
      const paymentSedeId = caja?.sedeId || usuario.sedeId
      if (user) TicketAccessPolicy.assertPayment(user, paymentSedeId)
      const nuevoPagado = Math.round((pagadoAnterior + monto) * 100) / 100
      ticket.pagado = nuevoPagado >= Number(ticket.total) - 0.01
      ticket.fechaPago = ticket.pagado ? new Date() : ticket.fechaPago
      ticket.metodoPago = metodo
      ticket.montoPagado = nuevoPagado
      await manager.save(Ticket, ticket)
      const pago = await manager.save(Pago, manager.create(Pago, { ticket, ticketId: ticket.id, monto, metodoPago: metodo, usuario, usuarioId, sedeId: paymentSedeId }))
      if (caja) {
        await manager.save(MovimientoCaja, manager.create(MovimientoCaja, { cajaSesion: caja, cajaSesionId: caja.id, pago, pagoId: pago.id, usuario, usuarioId, tipo: TipoMovimientoCaja.INGRESO, metodoPago: metodo, monto, concepto: `Pago ticket ${ticket.numeroTicket}`, metadata: { ticketId: ticket.id, fuente: 'PAGO' } }))
      }
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, accion: 'PAGAR', entidad: 'Ticket', entidadId: id, despues: { pagado: ticket.pagado, monto, montoPagado: nuevoPagado, saldo: Math.max(0, Number(ticket.total) - nuevoPagado), metodoPago: metodo, cajaSesionId: caja?.id || null } }))
      return manager.findOne(Ticket, { where:{id}, relations:['origen','destino','remitente','destinatario','mercaderias','guiasRemision','bultos'] })
    })
  }

  async cambiarEstado(id: string, estado: EstadoTicket, user?: any, legacy = false, motivo?: string) {
    if (user && (!legacy || String(motivo || '').trim().length < 5 || !isGlobalRole(user))) {
      throw new BadRequestException({ statusCode: 409, code: 'DIRECT_TICKET_STATE_FORBIDDEN', message: 'El cambio directo de estado está deprecado; use el workflow operativo o una corrección administrativa autorizada', details: { legacyRequired: true } })
    }
    return this.dataSource.transaction(async manager => {
      const ticket = await manager.findOne(Ticket, { where: { id }, relations: ['usuarioCreacion', 'sedeRecepcion', 'destino', 'bultos'] })
      if (!ticket) throw new NotFoundException(`Ticket ${id} no encontrado`)
      if (user) TicketAccessPolicy.assertEditReception(user, ticket)
      const anterior = ticket.estado
      ticket.estado = estado
      const saved = await manager.save(Ticket, ticket)
      await manager.save(AuditLog, manager.create(AuditLog, {
        usuarioId: user?.sub, accion: 'CORRECCION_ADMINISTRATIVA', entidad: 'Ticket', entidadId: id,
        antes: { estado: anterior }, despues: { estado }, metadata: { motivo: motivo || 'Legacy autorizado', sinEventoFisico: true },
      }))
      return saved
    })
  }

  async corregirEstado(id: string, estadoDestino: EstadoTicket, motivo: string, user: any) {
    if (!user || !isGlobalRole(user)) throw new BadRequestException({ statusCode: 403, code: 'ADMIN_STATE_CORRECTION_FORBIDDEN', message: 'Solo SUPERVISOR o SUPERADMIN pueden corregir administrativamente el estado de un ticket', details: {} })
    if (String(motivo || '').trim().length < 5) throw new BadRequestException({ statusCode: 400, code: 'CORRECTION_REASON_REQUIRED', message: 'La corrección administrativa requiere un motivo de al menos 5 caracteres', details: {} })
    return this.cambiarEstado(id, estadoDestino, user, true, motivo)
  }

  async getQR(id: string, user?: any) {
    const t = await this.findOne(id, user)
    const qrPayload = `GRAEL|TICKET|${t.numeroTicket}|TOTAL|${t.total}|ESTADO|${t.estado}`
    const dataUrl = await QRCode.toDataURL(qrPayload, { width: 250, margin: 1 })
    return { qrUrl: dataUrl, dataUrl, qrPayload, numeroTicket:t.numeroTicket, total:t.total }
  }

  async exportarOS(filtros: any, user?: any) {
    const result = await this.findAll({ ...filtros, __export: true, page: 1, limit: 5000 }, user)
    const esc = (value: unknown) => {
      const text = String(value ?? '')
      const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
      return `"${safe.replace(/"/g, '""')}"`
    }
    const rows = result.data.map((t: any) => [
      t.fechaEmision, t.numeroTicket, t.estado, t.origen?.nombre, t.destino?.nombre,
      t.remitente?.razonSocial, t.destinatario?.razonSocial, t.tipoEntrega, t.total,
      t.pagado ? 'PAGADO' : 'NO PAGADO', t.anulado ? 'SI' : 'NO',
    ].map(esc).join(','))
    return ['FECHA,TICKET,ESTADO,ORIGEN,DESTINO,REMITENTE,DESTINATARIO,ENTREGA,TOTAL,PAGADO,ANULADO', ...rows].join('\\n')
  }

  async imprimir(id: string, user?: any) {
    const t: any = await this.findOne(id, user)
    const money = (v: unknown) => Number(v || 0).toFixed(2)
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
    const items = (t.mercaderias || []).map((m: any) => `<tr><td>${escapeHtml(m.tipo)}</td><td>${escapeHtml(m.descripcion)}</td><td>${escapeHtml(m.pesoTotal || 0)}</td><td>${escapeHtml(m.cantidad || 0)}</td><td>S/ ${money(m.total)}</td></tr>`).join('')
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ticket ${t.numeroTicket}</title><style>body{font-family:Arial,sans-serif;color:#172554;max-width:760px;margin:24px auto;font-size:12px}header{border-bottom:3px solid #173b78;padding-bottom:12px;display:flex;justify-content:space-between}h1{font-size:22px;margin:0}h2{font-size:14px;border-bottom:1px solid #dbe4ef;padding-bottom:5px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:7px;border-bottom:1px solid #e5e7eb;text-align:left}th{background:#eef5fb;font-size:10px;text-transform:uppercase}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{border:1px solid #dbe4ef;padding:10px;margin-top:12px}.total{text-align:right;font-size:16px;font-weight:bold}</style></head><body><header><div><h1>GRAEL</h1><div>Sistema de Gestión Logística</div></div><div><strong>${t.numeroTicket}</strong><br>${t.fechaEmision || ''}</div></header><div class="box grid"><div><strong>Origen</strong><br>${t.origen?.nombre || ''}</div><div><strong>Destino</strong><br>${t.destino?.nombre || ''}</div><div><strong>Remitente</strong><br>${t.remitente?.razonSocial || ''}<br>${t.remitente?.dni || t.remitente?.ruc || ''}</div><div><strong>Destinatario</strong><br>${t.destinatario?.razonSocial || ''}<br>${t.destinatario?.dni || t.destinatario?.ruc || ''}</div></div><h2>Mercadería</h2><table><thead><tr><th>Tipo</th><th>Descripción</th><th>Peso</th><th>Cant.</th><th>Total</th></tr></thead><tbody>${items}</tbody></table><div class="box"><div>Tipo de pago: ${t.tipoPago || ''} · Entrega: ${t.tipoEntrega || ''}</div><div>Subtotal: S/ ${money(t.subTotal)} · IGV: S/ ${money(t.igv)}</div><div class="total">TOTAL: S/ ${money(t.total)}</div></div><script>window.onload=()=>window.print()</script></body></html>`
  }

  async getEstadisticas(user?: any) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy); manana.setDate(manana.getDate() + 1)
    const sedeId = effectiveSedeId(user)
    const ticketBase = this.ticketRepo.createQueryBuilder('t')
    if (sedeId) ticketBase.andWhere('t.sede_recepcion_id = :statsSedeId', { statsSedeId: sedeId })
    const paymentBase = this.pagoRepo.createQueryBuilder('p')
    if (sedeId) paymentBase.andWhere('p.sede_id = :statsSedeId', { statsSedeId: sedeId })

    const [ticketsHoy, pendientesCobro, enTransito, desembarque] = await Promise.all([
      ticketBase.clone().andWhere('t.created_at BETWEEN :hoy AND :manana', { hoy, manana }).getCount(),
      ticketBase.clone().andWhere('t.pagado = false AND t.anulado = false').getCount(),
      ticketBase.clone().andWhere('t.estado = :estado', { estado: EstadoTicket.EN_TRANSITO }).getCount(),
      ticketBase.clone().andWhere('t.estado = :desembarque', { desembarque: EstadoTicket.DESEMBARQUE_EN_DESTINO }).getCount(),
    ])
    const [cobradoHoy, montoPendiente] = await Promise.all([
      paymentBase.clone().select('COALESCE(SUM(p.monto),0)', 'total').andWhere('p.created_at BETWEEN :hoy AND :manana', { hoy, manana }).getRawOne(),
      ticketBase.clone().select('COALESCE(SUM(t.total),0)', 'total').andWhere('t.pagado = false AND t.anulado = false').getRawOne(),
    ])
    return { ticketsHoy, cobradoHoy: parseFloat(cobradoHoy?.total || '0'), pendientesCobro, montoPendiente: parseFloat(montoPendiente?.total || '0'), enTransito, desembarque }
  }
}
