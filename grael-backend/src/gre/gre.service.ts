import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common'
import { createHash } from 'crypto'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Comprobante, Manifiesto, TipoComprobante } from '../database/entities/operaciones.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { EstadoGreDocumento, GreDocumento } from '../database/entities/gre-documento.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertSedeAccess } from '../auth/sede-scope'

export type TipoDocumentoGre = 'GRE' | 'CPE'
type GreActor = { sub?: string; rol?: string; sedeId?: string | null }

@Injectable()
export class GreService {
  private readonly provider = (process.env.GRE_PROVIDER || 'MOCK').toUpperCase()

  constructor(
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Comprobante) private readonly comprobanteRepo: Repository<Comprobante>,
    private readonly dataSource: DataSource,
    @Optional() @InjectRepository(GreDocumento) private readonly greRepo?: Repository<GreDocumento>,
    @Optional() @InjectRepository(AuditLog) private readonly auditRepo?: Repository<AuditLog>,
  ) {}

  async emitir(dto: { ticketId?: string; manifiestoId?: string; tipo?: TipoDocumentoGre; tipoComprobante?: TipoComprobante; serie?: string; observacion?: string }, actor: string | GreActor) {
    if (this.provider === 'SUNAT') throw new ServiceUnavailableException('Proveedor SUNAT real pendiente: requiere credenciales, certificado digital, homologación y endpoint configurado')
    if (!dto.ticketId) throw new BadRequestException('ticketId es obligatorio')
    const actorContext: GreActor = typeof actor === 'string' ? { sub: actor } : { sub: actor?.sub, rol: actor?.rol, sedeId: actor?.sedeId || null }
    const usuarioId = actorContext.sub
    if (!usuarioId) throw new ForbiddenException({ statusCode: 403, code: 'ACTOR_REQUIRED', message: 'La emisión requiere usuario autenticado', details: {} })

    const ticket = await this.ticketRepo.findOne({ where: { id: dto.ticketId }, relations: ['origen', 'destino', 'remitente', 'destinatario', 'mercaderias', 'guiasRemision', 'usuarioCreacion', 'sedeRecepcion'] })
    if (!ticket) throw new BadRequestException('Ticket no encontrado')
    const tipo = dto.tipo || 'GRE'
    if (!['GRE', 'CPE'].includes(tipo)) throw new BadRequestException('tipo debe ser GRE o CPE')
    if (ticket.anulado) throw new BadRequestException('No se puede emitir un documento para un ticket anulado')
    let emissionSedeId = ticket.sedeRecepcionId || ticket.usuarioCreacion?.sedeId
    if (!emissionSedeId) throw new ForbiddenException({ statusCode: 403, code: 'GRE_EMISSION_SITE_UNKNOWN', message: 'No se puede determinar la sede de emisión desde el ticket', details: { ticketId: ticket.id } })

    const comprobanteTipo = dto.tipoComprobante || (ticket.remitente?.ruc ? TipoComprobante.FACTURA : TipoComprobante.BOLETA)
    const total = Number(ticket.total || 0)
    const subTotal = Number(ticket.subTotal || 0)
    const igv = Number(ticket.igv || 0)

    const result = await this.dataSource.transaction(async manager => {
      let manifiesto: Manifiesto | null = null
      if (dto.manifiestoId) {
        manifiesto = await manager.findOne(Manifiesto, { where: { id: dto.manifiestoId }, relations: ['tickets'] })
        if (!manifiesto) throw new NotFoundException('Manifiesto no encontrado')
        if (!(manifiesto.tickets || []).some(item => item.id === ticket.id)) throw new BadRequestException({ statusCode: 400, code: 'GRE_TICKET_MANIFEST_MISMATCH', message: 'El ticket no pertenece al manifiesto indicado', details: { ticketId: ticket.id, manifiestoId: dto.manifiestoId } })
        // En un documento asociado a manifiesto, la sede documental es la sede origen del tramo.
        emissionSedeId = manifiesto.sedeOrigenId || emissionSedeId
      }
      if (actorContext.sedeId) assertSedeAccess(actorContext, emissionSedeId, 'emitir documentos')

      const defaultSerie = tipo === 'GRE' ? `G${emissionSedeId.replace(/-/g, '').slice(0, 5).toUpperCase()}` : `${comprobanteTipo === TipoComprobante.FACTURA ? 'F' : 'B'}${emissionSedeId.replace(/-/g, '').slice(0, 5).toUpperCase()}`
      const serie = (dto.serie || defaultSerie).replace(/[^0-9A-Z-]/gi, '').slice(0, 10)
      // La fila de SerieDocumento se incrementa atómicamente. El fallback query-builder existe solo para specs antiguas.
      const sequenceRows = await manager.query(`INSERT INTO "series_documento" ("tipo", "serie", "sede_id", "correlativo_actual") VALUES ($1, $2, $3, 1) ON CONFLICT ("tipo", "sede_id", "serie") DO UPDATE SET "correlativo_actual" = "series_documento"."correlativo_actual" + 1, "updated_at" = NOW() RETURNING "correlativo_actual"`, [tipo, serie, emissionSedeId])
      let sequence = Array.isArray(sequenceRows) && sequenceRows[0]?.correlativo_actual !== undefined ? Number(sequenceRows[0].correlativo_actual) : 0
      if (!sequence) {
        const legacy = await manager.createQueryBuilder(GreDocumento, 'g').select('MAX(CAST(g.numero AS INTEGER))', 'max').where('g.tipo = :tipo', { tipo }).andWhere('g.serie = :serie', { serie }).andWhere('g.sedeId = :emissionSedeId', { emissionSedeId }).getRawOne()
        sequence = Number(legacy?.max || 0) + 1
      }
      const numero = String(sequence).padStart(8, '0')
      let comprobante: Comprobante | null = null
      if (tipo === 'CPE') {
        comprobante = await manager.save(Comprobante, manager.create(Comprobante, { tipo: comprobanteTipo, serie, numero, ticket, cliente: ticket.remitente, subTotal, igv, total, estado: 'EMITIDO', usuario: { id: usuarioId } as any, sedeEmisionId: emissionSedeId }))
      }
      const codigo = `${tipo}-${emissionSedeId}-${serie}-${numero}`
      const xml = this.buildXml({ tipo, codigo, ticket, comprobanteTipo, serie, numero, subTotal, igv, total, observacion: dto.observacion })
      const hashXml = createHash('sha256').update(xml, 'utf8').digest('hex')
      const documento = await manager.save(GreDocumento, manager.create(GreDocumento, { ticketId: ticket.id, manifiestoId: dto.manifiestoId || null, sedeId: emissionSedeId || null, comprobanteId: comprobante?.id || null, usuarioId, tipo, codigo, serie, numero, proveedor: this.provider, estado: this.provider === 'MOCK' ? EstadoGreDocumento.ACEPTADO_MOCK : EstadoGreDocumento.EMITIDO, xml, hashXml, actorContext, observacion: dto.observacion || null }))
      if (this.auditRepo) await manager.save(AuditLog, manager.create(AuditLog, { usuarioId, sedeId: emissionSedeId, accion: 'GRE_CREATED', entidad: 'GreDocumento', entidadId: documento.id, despues: { tipo, codigo, serie, numero, proveedor: this.provider, hashXml, manifiestoId: dto.manifiestoId || null }, metadata: { actorContext, mock: this.provider === 'MOCK' } }))
      return { documento, comprobante, codigo, xml, hashXml, numero, serie, estado: this.provider === 'MOCK' ? EstadoGreDocumento.ACEPTADO_MOCK : EstadoGreDocumento.EMITIDO }
    })

    return { modo: 'MOCK', proveedor: this.provider, tipo, codigo: result.codigo, serie: result.serie, numero: result.numero, estado: result.estado, ticketId: ticket.id, ticket: ticket.numeroTicket, xml: result.xml, hashXml: result.hashXml, documentoId: result.documento.id, comprobanteId: result.comprobante?.id || null, advertencia: 'Documento simulado. La emisión legal requiere integración SUNAT, credenciales y certificado digital.' }
  }

  async obtener(id: string, user?: GreActor) {
    if (!this.greRepo) throw new ServiceUnavailableException('Persistencia GRE no disponible en este contexto')
    const documento = await this.greRepo.findOne({ where: { id }, relations: ['ticket', 'ticket.usuarioCreacion'] })
    if (!documento) throw new BadRequestException('Documento GRE/CPE no encontrado')
    const sedeId = documento.sedeId || documento.ticket?.sedeRecepcionId || documento.ticket?.usuarioCreacion?.sedeId
    if (user) assertSedeAccess(user, sedeId, 'consultar documentos GRE/CPE')
    return documento
  }

  private buildXml(input: any) {
    const esc = (value: any) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    const items = (input.ticket.mercaderias || []).map((item: any) => `<Item><Descripcion>${esc(item.descripcion)}</Descripcion><Cantidad>${esc(item.cantidad)}</Cantidad><Peso>${esc(item.pesoTotal)}</Peso><Total>${esc(item.total)}</Total></Item>`).join('')
    return `<?xml version="1.0" encoding="UTF-8"?><GRAELDocumento><Tipo>${input.tipo}</Tipo><Codigo>${esc(input.codigo)}</Codigo><Ticket>${esc(input.ticket.numeroTicket)}</Ticket><FechaEmision>${new Date().toISOString()}</FechaEmision><Origen>${esc(input.ticket.origen?.nombre)}</Origen><Destino>${esc(input.ticket.destino?.nombre)}</Destino><Remitente>${esc(input.ticket.remitente?.razonSocial)}</Remitente><Destinatario>${esc(input.ticket.destinatario?.razonSocial)}</Destinatario><Documento><Tipo>${esc(input.comprobanteTipo)}</Tipo><Serie>${esc(input.serie)}</Serie><Numero>${esc(input.numero)}</Numero><SubTotal>${input.subTotal.toFixed(2)}</SubTotal><IGV>${input.igv.toFixed(2)}</IGV><Total>${input.total.toFixed(2)}</Total></Documento><Items>${items}</Items><Observacion>${esc(input.observacion)}</Observacion></GRAELDocumento>`
  }
}
