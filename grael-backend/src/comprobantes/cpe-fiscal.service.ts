import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource, EntityManager } from 'typeorm'
import { assertAnySedeAccess, ScopeUser } from '../auth/sede-scope'
import { EstadoComprobante } from '../common/dto/comprobante.dto'
import { hoyPeru, limitesDiaPeru } from '../common/peru-time'
import { AuditLog } from '../database/entities/audit-log.entity'
import { EstadoGreDocumento as Estado, GreDocumento } from '../database/entities/gre-documento.entity'
import { Comprobante, TipoComprobante } from '../database/entities/operaciones.entity'
import { Sede } from '../database/entities/sede.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { detraccionTransporte } from '../sunat/detraccion'
import { hashBytes, parseCdr, ublZip } from '../sunat/sunat-archive'
import { assertTransmissionEnabled, readSunatProfile, requireValue, SunatProfile, validRuc } from '../sunat/sunat-config'
import { unavailableSunat } from '../sunat/sunat-http'
import { signUbl, SunatSchema } from '../sunat/sunat-xml'
import { consultCpe, cpeProfile, sendCpe } from './cpe-sunat.client'
import { CpeSeriesDto, CpeType, EmitCpeFiscalDto } from './cpe.dto'
import { buildCpeXml, CpeSnapshot } from './cpe-ubl'

const cents = (value: unknown) => Math.round(Number(value || 0) * 100)
const complete = [Estado.ACEPTADO, Estado.ACEPTADO_CON_OBSERVACIONES, Estado.RECHAZADO, Estado.ANULADO]

function series(type: CpeType, value: string) {
  if (!(type === '01' ? /^F[A-Z0-9]{3}$/ : /^B[A-Z0-9]{3}$/).test(value)) throw new BadRequestException('Use una serie F para factura o B para boleta')
}

function identity(doc: GreDocumento) {
  return `${doc.rucEmisor}-${doc.tipoTributario}-${doc.serie}-${doc.numero}`
}

@Injectable()
export class CpeFiscalService {
  constructor(private readonly db: DataSource, private readonly schema: SunatSchema) {}

  async registerSeries(dto: CpeSeriesDto, actor: ScopeUser) {
    const profile = readSunatProfile('CPE')
    series(dto.tipo, dto.serie)
    return this.db.transaction(async manager => {
      if (!await manager.existsBy(Sede, { id: dto.sedeId })) throw new NotFoundException('Sede no encontrada')
      const rows = await manager.query(`
        INSERT INTO series_sunat (ambiente, ruc, tipo, serie, sede_id, correlativo_actual, codigo_establecimiento)
        VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING RETURNING serie
      `, [profile.environment, profile.issuer.ruc, dto.tipo, dto.serie, dto.sedeId, dto.ultimoCorrelativo, dto.codigoEstablecimiento])
      if (!rows.length) throw new ConflictException('La serie tributaria ya existe para este RUC y ambiente')
      await manager.insert(AuditLog, {
        usuarioId: actor.sub, sedeId: dto.sedeId, accion: 'SUNAT_SERIE_REGISTRADA', entidad: 'SerieSunat',
        entidadId: `${profile.environment}:${profile.issuer.ruc}:${dto.tipo}:${dto.serie}`,
        despues: { ...dto, ambiente: profile.environment, ruc: profile.issuer.ruc },
      })
      return { ambiente: profile.environment, sedeId: dto.sedeId, tipo: dto.tipo, serie: dto.serie }
    })
  }

  private view(doc: GreDocumento) {
    return {
      documentoId: doc.id, comprobanteId: doc.comprobanteId, ticketId: doc.ticketId, estado: doc.estado,
      ambiente: doc.ambienteSunat, serie: doc.serie, numero: doc.numero, hashXml: doc.hashXml, respuestaSunat: doc.respuestaSunat,
    }
  }

  private async findByComprobante(manager: EntityManager, id: string, actor: ScopeUser, lock = false) {
    const row = manager.createQueryBuilder(GreDocumento, 'doc')
      .where('doc.comprobante_id = :id AND doc.tipo = :tipo AND doc.ambiente_sunat IS NOT NULL', { id, tipo: 'CPE' })
    if (lock) row.setLock('pessimistic_write')
    const doc = await row.getOne()
    if (!doc) throw new NotFoundException('No existe un envío SUNAT para este comprobante')
    assertAnySedeAccess(actor, [doc.sedeId], 'gestionar el comprobante electrónico')
    return doc
  }

  private async audit(manager: EntityManager, doc: GreDocumento, actor: ScopeUser, accion: string) {
    await manager.insert(AuditLog, {
      usuarioId: actor.sub, sedeId: doc.sedeId, entidad: 'GreDocumento', entidadId: doc.id, accion,
      despues: { estado: doc.estado, ambiente: doc.ambienteSunat, serie: doc.serie, numero: doc.numero, codigoSunat: doc.respuestaSunat?.codigo },
      metadata: { ticketId: doc.ticketId, comprobanteId: doc.comprobanteId, hashXml: doc.hashXml },
    })
  }

  private async snapshot(manager: EntityManager, ticket: Ticket, dto: EmitCpeFiscalDto, profile: SunatProfile, establecimiento: string): Promise<CpeSnapshot> {
    const buyer = ticket.remitente
    const hasRuc = buyer?.ruc && validRuc(buyer.ruc)
    const dni = buyer?.dni
    if (!buyer?.razonSocial?.trim() || (dto.tipo === '01' ? !hasRuc : !hasRuc && !/^\d{8}$/.test(dni || ''))) {
      throw new BadRequestException('Revise la identificación del cliente. La factura requiere RUC válido.')
    }
    const importeCentimos = cents(ticket.total)
    const netoCentimos = cents(ticket.subTotal)
    const igvCentimos = cents(ticket.igv)
    if (netoCentimos <= 0 || importeCentimos !== netoCentimos + igvCentimos || Math.round(netoCentimos * 18 / 100) !== igvCentimos) {
      throw new BadRequestException('El flujo CPE requiere una operación nacional en soles, gravada con 18% de IGV y con totales consistentes')
    }
    const declared = dto.valorReferencialTipo === 'DECLARADO'
    const referencial = dto.valorReferencial ? Number(dto.valorReferencial) : undefined
    if (declared ? !referencial || referencial <= 0 : referencial !== undefined) {
      throw new BadRequestException('Confirme si corresponde un valor referencial e indique el importe calculado')
    }
    const spot = detraccionTransporte({
      importe: importeCentimos / 100, valorReferencial: referencial, gravado: true, domiciliado: true,
      sustentaCreditoOCosto: dto.tipo === '01', sectorPublico: dto.sectorPublico,
    })
    if (spot.aplica && dto.tipo !== '01') throw new BadRequestException('El flujo SPOT habilitado requiere una factura')
    if (spot.aplica && cents(spot.monto) > importeCentimos) throw new BadRequestException('Revise el valor referencial y monto de detracción')
    let detraccion: CpeSnapshot['detraccion']
    if (spot.aplica) {
      const cuenta = requireValue(`SUNAT_CPE_${profile.environment}_CUENTA_DETRACCION`)
      if (!/^\d{11}$/.test(cuenta)) throw new BadRequestException('Configure una cuenta de detracciones válida')
      detraccion = { cuenta, valorReferencial: referencial, monto: spot.monto }
    }

    const [payment] = await manager.query('SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE ticket_id = $1', [ticket.id])
    const pending = importeCentimos - cents(payment.total)
    if (dto.formaPago === 'Contado' && pending > 0) throw new BadRequestException('El ticket aún tiene un saldo registrado en Caja')
    const saldoCentimos = Math.max(0, pending - cents(detraccion?.monto))
    if (dto.formaPago === 'Credito') {
      if (dto.tipo !== '01' || saldoCentimos <= 0 || !dto.vencimiento) throw new BadRequestException('El crédito requiere factura con saldo y una fecha de vencimiento')
      limitesDiaPeru(dto.vencimiento)
      if (dto.vencimiento < hoyPeru()) throw new BadRequestException('La cuota no puede vencer antes de la emisión')
    }

    return {
      issuer: profile.issuer, tipo: dto.tipo, serie: dto.serie, establecimiento, ticket: ticket.numeroTicket,
      buyer: { tipo: hasRuc ? '6' : '1', doc: hasRuc ? buyer.ruc : dni, nombre: buyer.razonSocial },
      importeCentimos, netoCentimos, igvCentimos, formaPago: dto.formaPago, saldoCentimos, vencimiento: dto.vencimiento, detraccion,
    }
  }

  async issue(dto: EmitCpeFiscalDto, actor: ScopeUser) {
    const profile = cpeProfile()
    assertTransmissionEnabled('CPE', profile)
    series(dto.tipo, dto.serie)
    const codigo = `CPE-${profile.environment}-${profile.issuer.ruc}-${dto.solicitudId.toLowerCase()}`
    const prepared = await this.db.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [codigo])
      const existing = await manager.findOneBy(GreDocumento, { codigo })
      if (existing) {
        assertAnySedeAccess(actor, [existing.sedeId], 'consultar el comprobante')
        if (existing.ticketId !== dto.ticketId || existing.tipoTributario !== dto.tipo || existing.serie !== dto.serie) {
          throw new ConflictException('El identificador de solicitud ya tiene otro comprobante')
        }
        return { doc: existing, zip: null }
      }
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`CPE:${profile.environment}:${dto.ticketId}`])
      const ticket = await manager.findOne(Ticket, { where: { id: dto.ticketId }, relations: { remitente: true, usuarioCreacion: true }, loadEagerRelations: false })
      if (!ticket || ticket.anulado) throw new BadRequestException('Seleccione un ticket activo')
      const sedeId = ticket.sedeRecepcionId || ticket.usuarioCreacion?.sedeId
      if (!sedeId) throw new ForbiddenException('No se pudo determinar la sede de emisión')
      assertAnySedeAccess(actor, [sedeId], 'emitir un comprobante')
      const other = await manager.createQueryBuilder(GreDocumento, 'g')
        .where("g.ticket_id = :ticketId AND g.tipo = 'CPE' AND g.ambiente_sunat = :env AND g.estado NOT IN ('RECHAZADO','ANULADO')", { ticketId: ticket.id, env: profile.environment })
        .getExists()
      if (other) throw new ConflictException('El ticket ya tiene un comprobante tributario en proceso o aceptado')
      const rows = await manager.query(`
        WITH next AS (
          UPDATE series_sunat SET correlativo_actual = correlativo_actual + 1
          WHERE ambiente = $1 AND ruc = $2 AND tipo = $3 AND serie = $4 AND sede_id = $5 AND activo AND correlativo_actual < 99999999
          RETURNING correlativo_actual, codigo_establecimiento
        ) SELECT * FROM next
      `, [profile.environment, profile.issuer.ruc, dto.tipo, dto.serie, sedeId])
      const next = rows[0]
      if (!next?.codigo_establecimiento) throw new BadRequestException('Registre una serie CPE activa para la sede con su código de establecimiento SUNAT')
      const snapshot = await this.snapshot(manager, ticket, dto, profile, next.codigo_establecimiento)
      const numero = String(next.correlativo_actual)
      const xml = await signUbl(buildCpeXml(snapshot, numero), profile)
      await this.schema.assertValid(xml, 'Invoice')
      const comprobante = await manager.save(Comprobante, manager.create(Comprobante, {
        tipo: dto.tipo === '01' ? TipoComprobante.FACTURA : TipoComprobante.BOLETA,
        serie: dto.serie, numero, ticket, cliente: ticket.remitente, sedeEmisionId: sedeId,
        total: snapshot.importeCentimos / 100, subTotal: snapshot.netoCentimos / 100, igv: snapshot.igvCentimos / 100,
        estado: EstadoComprobante.ENVIADO, usuario: { id: actor.sub },
      }))
      const zip = ublZip(`${profile.issuer.ruc}-${dto.tipo}-${dto.serie}-${numero}`, xml)
      const doc = await manager.save(GreDocumento, manager.create(GreDocumento, {
        ticketId: ticket.id, sedeId, comprobanteId: comprobante.id, usuarioId: actor.sub, tipo: 'CPE',
        codigo, proveedor: 'SUNAT_SOAP', tipoTributario: dto.tipo, estado: Estado.ENVIANDO,
        serie: dto.serie, numero, ambienteSunat: profile.environment, rucEmisor: profile.issuer.ruc,
        datosFiscales: snapshot, xml, hashXml: hashBytes(xml), zipEnvio: zip, fechaEnvio: new Date(),
      }))
      await this.audit(manager, doc, actor, 'CPE_ENVIO_INICIADO')
      return { doc, zip }
    })
    const { doc, zip } = prepared
    if (!zip) return this.view(doc)

    let cdr: Buffer
    let receipt: Awaited<ReturnType<typeof parseCdr>>
    try {
      cdr = await sendCpe(profile, identity(doc), zip)
      receipt = await parseCdr(cdr, identity(doc), `${doc.serie}-${doc.numero}`)
    } catch {
      cdr = null
    }
    return this.record(doc.comprobanteId, actor, cdr, receipt)
  }

  private async record(id: string, actor: ScopeUser, cdr?: Buffer, receipt?: Awaited<ReturnType<typeof parseCdr>>) {
    return this.db.transaction(async manager => {
      const row = await this.findByComprobante(manager, id, actor, true)
      if (complete.includes(row.estado)) return this.view(row)
      let estadoCpe: EstadoComprobante
      if (cdr && receipt) {
        row.estado = Number(receipt.codigo) !== 0 ? Estado.RECHAZADO : receipt.observaciones.length ? Estado.ACEPTADO_CON_OBSERVACIONES : Estado.ACEPTADO
        estadoCpe = row.estado === Estado.RECHAZADO ? EstadoComprobante.RECHAZADO
          : row.ambienteSunat === 'TEST' ? EstadoComprobante.ACEPTADO_TEST : row.estado as unknown as EstadoComprobante
        row.zipCdr = cdr
        row.respuestaSunat = receipt
      } else {
        row.estado = Estado.ENVIO_INCIERTO
        estadoCpe = EstadoComprobante.PENDIENTE
        row.respuestaSunat = { codigo: 'SIN_CONFIRMACION', mensaje: 'No se recibió un CDR válido. Consulte el comprobante por su correlativo.' }
      }
      await manager.save(row)
      await manager.update(Comprobante, id, { estado: estadoCpe })
      await this.audit(manager, row, actor, cdr ? 'CPE_CDR_REGISTRADO' : 'CPE_ENVIO_INCIERTO')
      return this.view(row)
    })
  }

  async refresh(id: string, actor: ScopeUser) {
    const doc = await this.findByComprobante(this.db.manager, id, actor)
    if (complete.includes(doc.estado)) return this.view(doc)
    const profile = cpeProfile()
    if (doc.rucEmisor !== profile.issuer.ruc || doc.ambienteSunat !== profile.environment) {
      throw new ConflictException('El comprobante pertenece a otro RUC o ambiente')
    }
    let zip: Buffer
    let receipt: Awaited<ReturnType<typeof parseCdr>>
    try {
      zip = await consultCpe(profile, doc.tipoTributario as CpeType, doc.serie, doc.numero)
      receipt = await parseCdr(zip, identity(doc), `${doc.serie}-${doc.numero}`)
    } catch {
      throw unavailableSunat('No se pudo recuperar la constancia del comprobante')
    }
    return this.record(id, actor, zip, receipt)
  }

  async file(id: string, kind: 'xml' | 'cdr', actor: ScopeUser) {
    const doc = await this.findByComprobante(this.db.manager, id, actor)
    const name = identity(doc)
    if (kind === 'xml') return { bytes: Buffer.from(doc.xml), name: `${name}.xml`, type: 'application/xml' }
    const row = await this.db.manager.createQueryBuilder(GreDocumento, 'doc').select('doc.id').addSelect('doc.zipCdr').where('doc.id = :id', { id: doc.id }).getOne()
    if (!row?.zipCdr) throw new NotFoundException('El CDR todavía no está disponible')
    return { bytes: row.zipCdr, name: `R-${name}.zip`, type: 'application/zip' }
  }
}
