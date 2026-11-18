import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource, EntityManager, In } from 'typeorm'
import { assertAnySedeAccess, isGlobalRole, ScopeUser } from '../auth/sede-scope'
import { AuditLog } from '../database/entities/audit-log.entity'
import { Cliente } from '../database/entities/cliente.entity'
import { EstadoGreDocumento as Estado, GreDocumento } from '../database/entities/gre-documento.entity'
import { EstadoManifiesto, Manifiesto } from '../database/entities/operaciones.entity'
import { Sede } from '../database/entities/sede.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { decodeCdr, hashBytes, parseCdr, ublZip } from '../sunat/sunat-archive'
import { assertTransmissionEnabled, greProfile, readSunatProfile, SunatProfile } from '../sunat/sunat-config'
import { SunatHttpError, unavailableSunat } from '../sunat/sunat-http'
import { representationPdf } from '../sunat/representation-pdf'
import { signUbl, SunatSchema } from '../sunat/sunat-xml'
import { CreateGreDraftDto, GreDraftDataDto, GreFiscalQueryDto, GrePartyDto, GreSeriesDto, GreType, RecoverGreTicketDto } from './gre-fiscal.dto'
import { assertGreSeries, buildGreXml, GreSnapshot, validateGre } from './gre-ubl'
import { GreSunatClient } from './gre-sunat.client'

const terminal = [Estado.ACEPTADO, Estado.ACEPTADO_CON_OBSERVACIONES, Estado.RECHAZADO, Estado.ANULADO]
const selections = ['ticketId', 'manifiestoId', 'tipoGuia', 'solicitudId'] as const

function partyFromClient(client: Cliente): GrePartyDto {
  if (!client) throw new BadRequestException('El ticket debe tener remitente y destinatario registrados')
  const preferRuc = client.tipo === 'JURIDICO' || !client.dni
  return { tipoDocumento: preferRuc ? '6' : '1', documento: preferRuc ? client.ruc : client.dni, razonSocial: client.razonSocial }
}

function identity(doc: GreDocumento) {
  return `${doc.rucEmisor}-${doc.tipoTributario}-${doc.serie}-${doc.numero}`
}

@Injectable()
export class GreFiscalService {
  constructor(private readonly db: DataSource, private readonly sunat: GreSunatClient, private readonly schema: SunatSchema) {}

  private snapshot(doc: GreDocumento) { return doc.datosFiscales as GreSnapshot }

  private view(doc: GreDocumento, detail = false) {
    return {
      id: doc.id, ticketId: doc.ticketId, manifiestoId: doc.manifiestoId, sedeId: doc.sedeId,
      tipoGuia: doc.tipoTributario, serie: doc.serie, numero: doc.numero, codigo: doc.codigo,
      ambiente: doc.ambienteSunat, rucEmisor: doc.rucEmisor, estado: doc.estado,
      ticketSunat: doc.ticketSunat, respuestaSunat: doc.respuestaSunat,
      fechaEnvio: doc.fechaEnvio, hashXml: doc.hashXml, createdAt: doc.createdAt, updatedAt: doc.updatedAt,
      ...(detail ? { datos: this.snapshot(doc) } : {}),
    }
  }

  private query(manager: EntityManager) {
    return manager.createQueryBuilder(GreDocumento, 'g').where('g.tipo = :tipo AND g.ambiente_sunat IS NOT NULL', { tipo: 'GRE' })
  }

  private async requireDoc(manager: EntityManager, id: string, actor: ScopeUser, lock = false, withZip = false) {
    const query = this.query(manager).andWhere('g.id = :id', { id })
    if (lock) query.setLock('pessimistic_write')
    if (withZip) query.addSelect(['g.zipEnvio', 'g.zipCdr'])
    const doc = await query.getOne()
    if (!doc) throw new NotFoundException('Guía electrónica no encontrada')
    assertAnySedeAccess(actor, [doc.sedeId], 'acceder a la guía electrónica')
    return doc
  }

  private assertProfile(doc: GreDocumento, profile: SunatProfile) {
    if (doc.ambienteSunat !== profile.environment || doc.rucEmisor !== profile.issuer.ruc) {
      throw new ConflictException('La guía pertenece a otro ambiente o RUC de emisión')
    }
  }

  private async audit(manager: EntityManager, actor: ScopeUser, doc: GreDocumento, accion: string, extra: Record<string, unknown> = {}) {
    await manager.insert(AuditLog, {
      usuarioId: actor.sub, sedeId: doc.sedeId, entidad: 'GreDocumento', entidadId: doc.id, accion,
      despues: { estado: doc.estado, ambiente: doc.ambienteSunat, serie: doc.serie, numero: doc.numero, codigoSunat: doc.respuestaSunat?.codigo },
      metadata: { ticketId: doc.ticketId, manifiestoId: doc.manifiestoId, ticketSunat: doc.ticketSunat, hashXml: doc.hashXml, ...extra },
    })
  }

  private async logistics(manager: EntityManager, ticketId: string, manifestId: string | undefined, actor: ScopeUser) {
    const ticket = await manager.findOne(Ticket, {
      where: { id: ticketId }, loadEagerRelations: false,
      relations: { remitente: true, destinatario: true, usuarioCreacion: true },
    })
    if (!ticket || ticket.anulado) throw new BadRequestException('Seleccione un ticket activo')
    let manifiesto: Manifiesto
    if (manifestId) {
      manifiesto = await manager.findOne(Manifiesto, {
        where: { id: manifestId }, loadEagerRelations: false, relations: { vehiculo: true, conductor: true },
      })
      if (!manifiesto) throw new NotFoundException('Manifiesto no encontrado')
      const membership = await manager.query('SELECT 1 FROM manifiesto_tickets WHERE manifiesto_id = $1 AND ticket_id = $2', [manifestId, ticketId])
      if (!membership.length) throw new BadRequestException('El ticket no pertenece al manifiesto')
    }
    const sedeId = manifiesto?.sedeOrigenId || ticket.sedeRecepcionId || ticket.usuarioCreacion?.sedeId
    if (!sedeId) throw new ForbiddenException('No se pudo determinar la sede de emisión')
    assertAnySedeAccess(actor, [sedeId], 'gestionar documentos de la sede de emisión')
    return { ticket, manifiesto, sedeId }
  }

  private makeSnapshot(data: GreDraftDataDto, ticket: Ticket, manifest: Manifiesto | undefined, profile: SunatProfile, tipo: GreType): GreSnapshot {
    const traslado = { ...data }
    for (const property of selections) delete traslado[property]
    const fleetRelevant = tipo === '31' || traslado.modalidad === '02'
    if (fleetRelevant && manifest?.vehiculo) {
      const placa = manifest.vehiculo.placa.replace(/[-\s]/g, '').toUpperCase()
      if (traslado.vehiculo && traslado.vehiculo.placa !== placa) throw new BadRequestException('La placa no coincide con el manifiesto')
      const tuc = manifest.vehiculo.tuc || manifest.vehiculo.habilitacionMtc
      traslado.vehiculo ??= { placa, ...(tuc ? { tuc } : {}) }
    }
    if (fleetRelevant && manifest?.conductor) {
      const { dni, licencia, nombres, apellidos } = manifest.conductor
      if (traslado.conductores?.[0]?.dni && traslado.conductores[0].dni !== dni) {
        throw new BadRequestException('El conductor principal no coincide con el manifiesto')
      }
      traslado.conductores ??= [{ dni, licencia, nombres, apellidos }]
    }
    const remitente = tipo === '09' && ticket.remitente?.ruc === profile.issuer.ruc
      ? { tipoDocumento: '6' as const, documento: profile.issuer.ruc, razonSocial: profile.issuer.razonSocial }
      : partyFromClient(ticket.remitente)
    const snapshot = { traslado, issuer: profile.issuer, remitente, destinatario: partyFromClient(ticket.destinatario) }
    validateGre(tipo, snapshot)
    return snapshot
  }

  async registerSeries(dto: GreSeriesDto, actor: ScopeUser) {
    const profile = readSunatProfile('GRE')
    assertGreSeries(dto.tipoGuia, dto.serie)
    return this.db.transaction(async manager => {
      if (!await manager.existsBy(Sede, { id: dto.sedeId })) throw new NotFoundException('Sede no encontrada')
      const inserted = await manager.query(`
        INSERT INTO series_sunat (ambiente, ruc, tipo, serie, sede_id, correlativo_actual)
        VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING serie
      `, [profile.environment, profile.issuer.ruc, dto.tipoGuia, dto.serie, dto.sedeId, dto.ultimoCorrelativo])
      if (!inserted.length) throw new ConflictException('La serie tributaria ya existe para este RUC y ambiente')
      await manager.insert(AuditLog, {
        usuarioId: actor.sub, sedeId: dto.sedeId, accion: 'SUNAT_SERIE_REGISTRADA', entidad: 'SerieSunat',
        entidadId: `${profile.environment}:${profile.issuer.ruc}:${dto.tipoGuia}:${dto.serie}`,
        despues: { ambiente: profile.environment, ruc: profile.issuer.ruc, tipo: dto.tipoGuia, serie: dto.serie, ultimoCorrelativo: dto.ultimoCorrelativo },
      })
      return { ambiente: profile.environment, sedeId: dto.sedeId, serie: dto.serie, tipo: dto.tipoGuia }
    })
  }

  async createDraft(dto: CreateGreDraftDto, actor: ScopeUser) {
    const profile = readSunatProfile('GRE')
    const codigo = `GRE-${profile.environment}-${profile.issuer.ruc}-${dto.solicitudId.toLowerCase()}`
    return this.db.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [codigo])
      const existing = await manager.findOneBy(GreDocumento, { codigo })
      if (existing) {
        assertAnySedeAccess(actor, [existing.sedeId], 'volver a consultar la solicitud')
        if (existing.ticketId !== dto.ticketId || existing.tipoTributario !== dto.tipoGuia
          || existing.manifiestoId !== (dto.manifiestoId || null)) throw new ConflictException('El identificador de solicitud ya tiene otro documento')
        return this.view(existing, true)
      }
      const { ticket, manifiesto, sedeId } = await this.logistics(manager, dto.ticketId, dto.manifiestoId, actor)
      const snapshot = this.makeSnapshot(dto, ticket, manifiesto, profile, dto.tipoGuia)
      const doc = await manager.save(GreDocumento, manager.create(GreDocumento, {
        ticketId: dto.ticketId, manifiestoId: dto.manifiestoId ?? null, sedeId, usuarioId: actor.sub, tipo: 'GRE',
        codigo, proveedor: 'SUNAT_REST', tipoTributario: dto.tipoGuia, estado: Estado.BORRADOR, serie: dto.serie,
        ambienteSunat: profile.environment, rucEmisor: profile.issuer.ruc, datosFiscales: snapshot, xml: '',
      }))
      await this.audit(manager, actor, doc, 'GRE_BORRADOR_CREADO')
      return this.view(doc, true)
    })
  }

  async editDraft(id: string, dto: GreDraftDataDto, actor: ScopeUser) {
    const profile = readSunatProfile('GRE')
    return this.db.transaction(async manager => {
      const doc = await this.requireDoc(manager, id, actor, true)
      this.assertProfile(doc, profile)
      if (doc.estado !== Estado.BORRADOR) throw new ConflictException('La guía ya salió del estado borrador')
      const { ticket, manifiesto, sedeId } = await this.logistics(manager, doc.ticketId, doc.manifiestoId, actor)
      if (doc.sedeId !== sedeId) throw new ConflictException('La sede del traslado cambió desde la creación')
      doc.datosFiscales = this.makeSnapshot(dto, ticket, manifiesto, profile, doc.tipoTributario as GreType)
      doc.serie = dto.serie
      await manager.save(doc)
      await this.audit(manager, actor, doc, 'GRE_BORRADOR_EDITADO')
      return this.view(doc, true)
    })
  }

  async list(params: GreFiscalQueryDto, actor: ScopeUser) {
    const query = this.query(this.db.manager)
      .select(['g.id', 'g.tipoTributario', 'g.ambienteSunat', 'g.rucEmisor', 'g.sedeId', 'g.ticketId', 'g.manifiestoId', 'g.serie', 'g.numero', 'g.estado', 'g.ticketSunat', 'g.createdAt', 'g.updatedAt'])
    if (!isGlobalRole(actor)) {
      if (!actor.sedeId) throw new ForbiddenException('Se requiere una sede asignada')
      query.andWhere('g.sede_id = :sede', { sede: actor.sedeId })
    }
    if (params.ticketId) query.andWhere('g.ticket_id = :ticket', { ticket: params.ticketId })
    if (params.manifiestoId) query.andWhere('g.manifiesto_id = :manifest', { manifest: params.manifiestoId })
    const [data, total] = await query.orderBy('g.created_at', 'DESC').addOrderBy('g.id', 'DESC').skip((params.page - 1) * 25).take(25).getManyAndCount()
    return { data: data.map(doc => this.view(doc)), total, page: params.page, totalPages: Math.ceil(total / 25) }
  }

  async detail(id: string, actor: ScopeUser) {
    return this.view(await this.requireDoc(this.db.manager, id, actor), true)
  }

  async validate(id: string, actor: ScopeUser) {
    const profile = readSunatProfile('GRE')
    const doc = await this.requireDoc(this.db.manager, id, actor)
    this.assertProfile(doc, profile)
    const preview = doc.xml || await signUbl(buildGreXml(doc.tipoTributario as GreType, this.snapshot(doc), '1'), profile)
    await this.schema.assertValid(preview, 'DespatchAdvice')
    return { valido: true, esquema: 'UBL 2.1 / GRE 2.0', ambiente: doc.ambienteSunat, estado: doc.estado }
  }

  private async prepareSend(id: string, actor: ScopeUser, profile: SunatProfile) {
    return this.db.transaction(async manager => {
      const doc = await this.requireDoc(manager, id, actor, true, true)
      this.assertProfile(doc, profile)
      if (![Estado.BORRADOR, Estado.REINTENTABLE].includes(doc.estado)) return { doc, send: false }

      const { ticket, manifiesto, sedeId } = await this.logistics(manager, doc.ticketId, doc.manifiestoId, actor)
      if (sedeId !== doc.sedeId || manifiesto && manifiesto.estado !== EstadoManifiesto.ABIERTO) {
        throw new ConflictException('El manifiesto debe seguir abierto y conservar la sede de emisión')
      }
      // Serializa solicitudes distintas que intenten emitir la misma guía operativa.
      const key = [doc.ambienteSunat, doc.tipoTributario, doc.ticketId, doc.manifiestoId || ''].join(':')
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key])
      const existing = await this.query(manager)
        .andWhere('g.id <> :id AND g.ambiente_sunat = :env AND g.tipo_tributario = :type AND g.ticket_id = :ticket', {
          id, env: doc.ambienteSunat, type: doc.tipoTributario, ticket: ticket.id,
        })
        .andWhere('g.manifiesto_id IS NOT DISTINCT FROM :manifest', { manifest: doc.manifiestoId })
        .andWhere('g.estado NOT IN (:...excluded)', { excluded: [Estado.BORRADOR, Estado.RECHAZADO, Estado.ANULADO] })
        .getOne()
      if (existing) throw new ConflictException('El ticket y tramo ya tienen una guía de este tipo en proceso o aceptada')

      if (doc.estado === Estado.BORRADOR) {
        const draft = this.snapshot(doc)
        const fresh = this.makeSnapshot(draft.traslado, ticket, manifiesto, profile, doc.tipoTributario as GreType)
        const result = await manager.query(`
          WITH next AS (
            UPDATE series_sunat SET correlativo_actual = correlativo_actual + 1
            WHERE ambiente = $1 AND ruc = $2 AND tipo = $3 AND serie = $4 AND sede_id = $5
              AND activo AND correlativo_actual < 99999999
            RETURNING correlativo_actual
          ) SELECT correlativo_actual FROM next
        `, [doc.ambienteSunat, doc.rucEmisor, doc.tipoTributario, doc.serie, doc.sedeId])
        if (!result.length) throw new BadRequestException('Registre una serie tributaria activa y con correlativo disponible para la sede')
        doc.numero = String(result[0].correlativo_actual)
        doc.datosFiscales = fresh
        doc.xml = await signUbl(buildGreXml(doc.tipoTributario as GreType, fresh, doc.numero), profile)
        await this.schema.assertValid(doc.xml, 'DespatchAdvice')
        doc.hashXml = hashBytes(doc.xml)
        doc.zipEnvio = ublZip(identity(doc), doc.xml)
      }
      if (!doc.zipEnvio?.length) throw new ConflictException('No se encontró el archivo original de envío')
      doc.estado = Estado.ENVIANDO
      doc.fechaEnvio = new Date()
      doc.respuestaSunat = null
      await manager.save(doc)
      await this.audit(manager, actor, doc, 'GRE_ENVIO_INICIADO')
      return { doc, send: true }
    })
  }

  async send(id: string, actor: ScopeUser) {
    const profile = greProfile()
    assertTransmissionEnabled('GRE', profile)
    const current = await this.requireDoc(this.db.manager, id, actor)
    this.assertProfile(current, profile)
    if (![Estado.BORRADOR, Estado.REINTENTABLE].includes(current.estado)) return this.view(current, true)
    const token = await this.sunat.token(profile)
    const { doc, send } = await this.prepareSend(id, actor, profile)
    if (!send) return this.view(doc, true)
    let ticket: string
    let failure: GreDocumento['respuestaSunat']
    let retryable = false
    try {
      ticket = await this.sunat.send(profile, token, identity(doc), doc.zipEnvio)
    } catch (error) {
      const status = error instanceof SunatHttpError ? error.status : null
      retryable = [401, 403].includes(status)
      failure = {
        codigo: status ? `HTTP_${status}` : 'SIN_CONFIRMACION',
        mensaje: retryable ? 'SUNAT rechazó la autorización. Corrija el acceso y reintente con el mismo archivo.'
          : 'SUNAT no confirmó el ticket. Verifique el envío antes de registrar otro documento.',
      }
    }
    return this.db.transaction(async manager => {
      const row = await this.requireDoc(manager, id, actor, true)
      if (row.estado !== Estado.ENVIANDO) return this.view(row, true)
      row.estado = ticket ? Estado.ENVIADO : retryable ? Estado.REINTENTABLE : Estado.ENVIO_INCIERTO
      row.ticketSunat = ticket || null
      row.respuestaSunat = failure || null
      await manager.save(row)
      await this.audit(manager, actor, row, ticket ? 'GRE_TICKET_RECIBIDO' : 'GRE_ENVIO_SIN_TICKET')
      return this.view(row, true)
    })
  }

  async recoverTicket(id: string, dto: RecoverGreTicketDto, actor: ScopeUser) {
    const profile = greProfile()
    const doc = await this.requireDoc(this.db.manager, id, actor)
    this.assertProfile(doc, profile)
    if (!this.canRecover(doc)) throw new ConflictException('La guía no está en estado de conciliación')
    const ticket = dto.ticket.toLowerCase()
    const outcome = await this.readOutcome(profile, doc, ticket)
    if (!outcome?.zip) throw new ConflictException('La conciliación requiere un CDR que identifique el número de la guía')
    return this.storeOutcome(id, ticket, outcome, actor, dto.motivo)
  }

  private canRecover(doc: GreDocumento) {
    return doc.estado === Estado.ENVIO_INCIERTO
      || doc.estado === Estado.ENVIANDO && Date.now() - doc.fechaEnvio?.getTime() > 60_000
  }

  private async readOutcome(profile: ReturnType<typeof greProfile>, doc: GreDocumento, ticket: string) {
    try {
      const response = await this.sunat.status(profile, ticket)
      if (response.code === '98') return null
      if (response.code === '99' && response.generated === '0') {
        return { estado: Estado.RECHAZADO, zip: null, receipt: {
          codigo: /^\d{1,8}$/.test(response.errorCode) ? response.errorCode : '99',
          mensaje: response.errorMessage,
        } }
      }
      if (!['0', '99'].includes(response.code) || response.generated !== '1') throw new Error('Respuesta GRE incompleta')
      const zip = decodeCdr(response.cdr)
      const receipt = await parseCdr(zip, identity(doc), `${doc.serie}-${doc.numero}`)
      if ((Number(receipt.codigo) === 0) !== (response.code === '0')) throw new Error('SUNAT devolvió estados inconsistentes')
      const estado = Number(receipt.codigo) !== 0 ? Estado.RECHAZADO
        : receipt.observaciones.length ? Estado.ACEPTADO_CON_OBSERVACIONES : Estado.ACEPTADO
      return { estado, zip, receipt }
    } catch {
      throw unavailableSunat('No se obtuvo una constancia SUNAT válida para la guía. Puede volver a consultar el ticket.')
    }
  }

  private async storeOutcome(id: string, ticket: string, outcome: NonNullable<Awaited<ReturnType<GreFiscalService['readOutcome']>>>, actor: ScopeUser, reason?: string) {
    return this.db.transaction(async manager => {
      const row = await this.requireDoc(manager, id, actor, true)
      if (terminal.includes(row.estado)) return this.view(row, true)
      if (reason ? !this.canRecover(row) : row.estado !== Estado.ENVIADO || row.ticketSunat !== ticket) {
        throw new ConflictException('La guía cambió durante la consulta')
      }
      const reused = await manager.existsBy(GreDocumento, { ambienteSunat: row.ambienteSunat, ticketSunat: ticket, estado: In([Estado.ENVIADO, ...terminal]) })
      if (reason && reused) throw new ConflictException('El ticket SUNAT ya está vinculado')
      row.ticketSunat = ticket
      row.estado = outcome.estado
      row.zipCdr = outcome.zip
      row.respuestaSunat = outcome.receipt
      await manager.save(row)
      await this.audit(manager, actor, row, 'GRE_ESTADO_SUNAT_REGISTRADO', reason ? { motivoConciliacion: reason } : {})
      return this.view(row, true)
    })
  }

  async refresh(id: string, actor: ScopeUser) {
    const doc = await this.requireDoc(this.db.manager, id, actor)
    if (terminal.includes(doc.estado)) return this.view(doc, true)
    if (doc.estado !== Estado.ENVIADO || !doc.ticketSunat) throw new ConflictException('La guía debe tener un ticket de SUNAT para consultar el estado')
    const profile = greProfile()
    this.assertProfile(doc, profile)
    const outcome = await this.readOutcome(profile, doc, doc.ticketSunat)
    return outcome ? this.storeOutcome(id, doc.ticketSunat, outcome, actor) : this.view(doc, true)
  }

  async file(id: string, kind: 'xml' | 'zip' | 'cdr' | 'pdf', actor: ScopeUser) {
    const doc = await this.requireDoc(this.db.manager, id, actor, false, kind === 'zip' || kind === 'cdr')
    const filename = doc.numero ? identity(doc) : doc.codigo
    if (kind === 'xml' && doc.xml) return { bytes: Buffer.from(doc.xml), name: `${filename}.xml`, mime: 'application/xml' }
    if (kind === 'zip' && doc.zipEnvio) return { bytes: doc.zipEnvio, name: `${filename}.zip`, mime: 'application/zip' }
    if (kind === 'cdr' && doc.zipCdr) return { bytes: doc.zipCdr, name: `R-${filename}.zip`, mime: 'application/zip' }
    if (kind !== 'pdf') throw new NotFoundException('Archivo tributario aún no disponible')

    const { traslado: t, issuer, remitente, destinatario } = this.snapshot(doc)
    const accepted = doc.ambienteSunat === 'PRODUCTION' && [Estado.ACEPTADO, Estado.ACEPTADO_CON_OBSERVACIONES].includes(doc.estado)
    const name = doc.tipoTributario === '31' ? 'GRE Transportista' : 'GRE Remitente'
    const pdf = await representationPdf({
      title: name,
      number: doc.numero ? `${doc.serie}-${doc.numero}` : 'Borrador',
      state: accepted ? `SUNAT · ${doc.estado.replace(/_/g, ' ')}`
        : `${doc.ambienteSunat === 'TEST' ? 'PRUEBAS · ' : ''}${doc.estado.replace(/_/g, ' ')} · SIN VALIDEZ TRIBUTARIA`,
      sections: [
        { title: 'Emisor', lines: [issuer.razonSocial, `RUC ${issuer.ruc}`, issuer.direccion] },
        { title: 'Traslado', lines: [
          `Fecha de traslado   ${t.fechaTraslado}`, `Partida   ${t.partida.ubigeo} · ${t.partida.direccion}`,
          `Llegada   ${t.llegada.ubigeo} · ${t.llegada.direccion}`, `Peso bruto   ${t.pesoBruto} ${t.unidadPeso}`,
          `Remitente   ${remitente.razonSocial} · ${remitente.documento}`,
          `Destinatario   ${destinatario.razonSocial} · ${destinatario.documento}`,
          ...(t.vehiculo ? [`Vehículo   ${t.vehiculo.placa}${t.vehiculo.tuc ? ` · TUC ${t.vehiculo.tuc}` : ''}`] : []),
          ...(t.conductores ?? []).map(driver => `Conductor   ${driver.nombres} ${driver.apellidos} · ${driver.licencia}`),
        ] },
        ...((t.referencias?.length) ? [{ title: 'Documentos relacionados', lines: t.referencias.map(ref => `${ref.tipo} · ${ref.numero} · RUC ${ref.rucEmisor}`) }] : []),
        ...((t.bienes?.length) ? [{ title: 'Bienes', lines: t.bienes.map(item => `${item.cantidad} ${item.unidad}   ${item.descripcion}`) }] : []),
        ...(doc.respuestaSunat ? [{ title: 'Respuesta de SUNAT', lines: [doc.respuestaSunat.codigo, doc.respuestaSunat.mensaje, ...(doc.respuestaSunat.observaciones ?? [])].filter(Boolean) }] : []),
      ],
    })
    return { bytes: pdf, name: `${filename}.pdf`, mime: 'application/pdf' }
  }
}
