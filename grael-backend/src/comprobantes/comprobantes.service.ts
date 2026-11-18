import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Comprobante } from '../database/entities/operaciones.entity'
import { RolUsuario } from '../database/entities/usuario.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertAnySedeAccess, effectiveSedeId, isGlobalRole, ScopeUser } from '../auth/sede-scope'
import { ComprobanteQueryDto, EstadoComprobante } from '../common/dto/comprobante.dto'
import { limitesDiaPeru } from '../common/peru-time'
import { representationPdf } from '../sunat/representation-pdf'

const emissionSite = 'COALESCE(c.sede_emision_id, ticket.sede_recepcion_id, creator.sede_id)'
const labels = { FACTURA: 'Factura', BOLETA: 'Boleta de venta', NOTA_CREDITO: 'Nota de crédito' }
const money = (value: number) => Number(value || 0).toFixed(2)

@Injectable()
export class ComprobantesService {
  constructor(
    @InjectRepository(Comprobante) private readonly repo: Repository<Comprobante>,
    private readonly dataSource: DataSource,
  ) {}

  private query() {
    return this.repo.createQueryBuilder('c')
      .leftJoin('c.ticket', 'ticket')
      .leftJoin('ticket.usuarioCreacion', 'creator')
      .leftJoin('c.cliente', 'cliente')
  }

  async listar(params: ComprobanteQueryDto, user: ScopeUser) {
    const { page = 1, limit = 20 } = params
    if (!isGlobalRole(user) && !user?.sedeId) throw new ForbiddenException('Se requiere una sede asignada')
    const sedeId = effectiveSedeId(user, params.sedeId)
    if (params.sedeId && sedeId !== params.sedeId) throw new ForbiddenException('No puede consultar comprobantes de otra sede')
    const dates = {
      desde: params.fechaDesde && limitesDiaPeru(params.fechaDesde).inicio,
      hasta: params.fechaHasta && new Date(limitesDiaPeru(params.fechaHasta).fin.getTime() + 1),
    }
    if (dates.desde && dates.hasta && dates.desde >= dates.hasta) throw new BadRequestException('La fecha inicial es posterior a la final')

    const qb = this.query()
    if (sedeId) qb.andWhere(`${emissionSite} = :sedeId`, { sedeId })
    if (params.tipo) qb.andWhere('c.tipo = :tipo', { tipo: params.tipo })
    if (params.estado) qb.andWhere('c.estado = :estado', { estado: params.estado })
    if (params.q?.trim()) {
      qb.andWhere("(c.serie ILIKE :q OR c.numero ILIKE :q OR concat(c.serie, '-', c.numero) ILIKE :q OR ticket.numero_ticket ILIKE :q OR cliente.razon_social ILIKE :q)", { q: `%${params.q.trim()}%` })
    }
    if (dates.desde) qb.andWhere('c.created_at >= :desde', dates)
    if (dates.hasta) qb.andWhere('c.created_at < :hasta', dates)

    const [baseSql, bindings] = qb.clone().select('c.id', 'id')
      .addSelect('c.ticket_id', 'ticket_id')
      .addSelect('c.total', 'total')
      .addSelect('c.estado', 'estado')
      .getQueryAndParameters()
    const parameters = [...bindings]
    const bind = (value: string | Date) => `$${parameters.push(value)}`
    const paymentSite = sedeId ? `AND p.sede_id = ${bind(sedeId)}` : ''
    const paymentStart = dates.desde ? `AND p.created_at >= ${bind(dates.desde)}` : ''
    const paymentEnd = dates.hasta ? `AND p.created_at < ${bind(dates.hasta)}` : ''
    const summaryPromise = this.dataSource.query(`
      WITH documentos AS (${baseSql}),
      validos AS (
        SELECT d.* FROM documentos d
        WHERE d.estado IN ('ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES')
          AND EXISTS (
            SELECT 1 FROM gre_documentos g
            WHERE g.comprobante_id = d.id AND g.ambiente_sunat = 'PRODUCTION'
              AND g.estado IN ('ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES')
          )
      ),
      facturas_ticket AS (
        SELECT ticket_id, SUM(total) AS total FROM validos WHERE ticket_id IS NOT NULL GROUP BY ticket_id
      ),
      cobros AS (
        SELECT p.ticket_id, SUM(p.monto) AS total,
          SUM(p.monto) FILTER (WHERE TRUE ${paymentStart} ${paymentEnd} ${paymentSite}) AS periodo
        FROM pagos p
        WHERE EXISTS (SELECT 1 FROM documentos d WHERE d.ticket_id = p.ticket_id)
        GROUP BY p.ticket_id
      )
      SELECT
        (SELECT count(*) FROM documentos) AS total,
        (SELECT COALESCE(SUM(total), 0) FROM validos) AS "totalFacturado",
        (SELECT COALESCE(SUM(periodo), 0) FROM cobros) AS "totalCobrado",
        (SELECT COALESCE(SUM(GREATEST(f.total - COALESCE(p.total, 0), 0)), 0)
          FROM facturas_ticket f LEFT JOIN cobros p ON p.ticket_id = f.ticket_id) AS "saldoPendiente",
        (SELECT COALESCE(SUM(total) FILTER (WHERE estado = 'ANULADO'), 0) FROM documentos) AS "totalAnulado",
        (SELECT COALESCE(SUM(total) FILTER (WHERE estado = 'RECHAZADO'), 0) FROM documentos) AS "totalRechazado"
    `, parameters)

    const [data, [resumen]] = await Promise.all([
      qb.addSelect(['ticket.id', 'ticket.numeroTicket', 'cliente.id', 'cliente.razonSocial', 'cliente.ruc', 'cliente.dni'])
        .orderBy('c.createdAt', 'DESC').addOrderBy('c.id', 'DESC').skip((page - 1) * limit).take(limit).getMany(),
      summaryPromise,
    ])
    const { total, ...montos } = resumen
    const count = Number(total)
    const pages = Math.ceil(count / limit)
    return { data, total: count, page, limit, pages, totalPages: pages, resumen: Object.fromEntries(Object.entries(montos).map(([key, value]) => [key, Number(value)])) }
  }

  async pdf(id: string, user: ScopeUser) {
    const comp = await this.query()
      .addSelect(['ticket.id', 'ticket.numeroTicket', 'ticket.sedeRecepcionId', 'creator.id', 'creator.sedeId', 'cliente.id', 'cliente.ruc', 'cliente.dni', 'cliente.razonSocial'])
      .where('c.id = :id', { id })
      .getOne()
    if (!comp) throw new NotFoundException('Comprobante no encontrado')
    assertAnySedeAccess(user, [comp.sedeEmisionId || comp.ticket?.sedeRecepcionId || comp.ticket?.usuarioCreacion?.sedeId], 'descargar comprobantes')
    const fiscal = await this.dataSource.query(`
      SELECT ambiente_sunat, estado, datos_fiscales->'issuer' AS issuer, respuesta_sunat AS respuesta
      FROM gre_documentos WHERE comprobante_id = $1 AND ambiente_sunat IS NOT NULL ORDER BY created_at DESC LIMIT 1
    `, [id])
    const issuer = fiscal[0]?.issuer
    const realAcceptance = fiscal[0]?.ambiente_sunat === 'PRODUCTION' && ['ACEPTADO', 'ACEPTADO_CON_OBSERVACIONES'].includes(fiscal[0]?.estado)
    const state = realAcceptance ? comp.estado.replace(/_/g, ' ') : `${comp.estado.replace(/_/g, ' ')} · SIN VALIDEZ TRIBUTARIA`
    const number = `${comp.serie}-${comp.numero}`
    const bytes = await representationPdf({
      title: labels[comp.tipo], number, state,
      sections: [
        { title: 'Emisor', lines: [
          issuer?.razonSocial || process.env.EMPRESA_RAZON_SOCIAL || 'Emisor pendiente de configuración',
          ...(issuer?.ruc || process.env.EMPRESA_RUC ? [`RUC ${issuer?.ruc || process.env.EMPRESA_RUC}`] : []),
          ...([issuer?.direccion || process.env.EMPRESA_DIRECCION].filter(Boolean)),
        ] },
        { title: 'Operación', lines: [
          `Cliente   ${comp.cliente?.razonSocial || 'Sin datos registrados'}`,
          ...(comp.cliente?.ruc || comp.cliente?.dni ? [`Documento   ${comp.cliente.ruc || comp.cliente.dni}`] : []),
          `Ticket   ${comp.ticket?.numeroTicket || 'Sin vínculo'}`,
          `Registro   ${new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Lima' }).format(comp.createdAt)}`,
        ] },
        { title: 'Importes en soles', lines: [`Subtotal   S/ ${money(comp.subTotal)}`, `IGV   S/ ${money(comp.igv)}`, `Total   S/ ${money(comp.total)}`] },
      ],
    })
    return { bytes, name: `comprobante-${number.replace(/[^A-Z0-9-]/gi, '')}.pdf` }
  }

  async anular(id: string, motivo: string, user: ScopeUser) {
    if (!motivo?.trim()) throw new BadRequestException('El motivo de anulación es obligatorio')
    if (!user || ![RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN].includes(user.rol as RolUsuario)) {
      throw new ForbiddenException('Solo SUPERVISOR o SUPERADMIN pueden anular comprobantes de pruebas')
    }
    return this.dataSource.transaction(async manager => {
      const comp = await manager.findOne(Comprobante, { where: { id }, loadEagerRelations: false, lock: { mode: 'pessimistic_write' } })
      if (!comp) throw new NotFoundException('Comprobante no encontrado')
      if (comp.estado !== EstadoComprobante.SIMULADO) throw new ConflictException('Solo se pueden anular aquí los comprobantes simulados')
      comp.estado = EstadoComprobante.ANULADO_MOCK
      const saved = await manager.save(Comprobante, comp)
      await manager.save(AuditLog, manager.create(AuditLog, {
        usuarioId: user.sub, sedeId: comp.sedeEmisionId, accion: 'COMPROBANTE_ANULADO_MOCK',
        entidad: 'Comprobante', entidadId: saved.id, antes: { estado: EstadoComprobante.SIMULADO },
        despues: { estado: saved.estado, motivo: motivo.trim() }, metadata: { tipo: saved.tipo, serie: saved.serie, numero: saved.numero },
      }))
      return saved
    })
  }
}
