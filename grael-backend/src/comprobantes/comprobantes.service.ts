import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Comprobante, TipoComprobante } from '../database/entities/operaciones.entity'
import { RolUsuario } from '../database/entities/usuario.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertSedeAccess, effectiveSedeId, isGlobalRole } from '../auth/sede-scope'
import { EstadoComprobante } from '../common/dto/comprobante.dto'

@Injectable()
export class ComprobantesService {
  constructor(
    @InjectRepository(Comprobante) private readonly repo: Repository<Comprobante>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(params: any, user?: any) {
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))
    const qb = this.repo.createQueryBuilder('c')
      .leftJoinAndSelect('c.ticket', 'ticket')
      .leftJoin('ticket.usuarioCreacion', 'creator')
      .leftJoin('ticket.sedeRecepcion', 'receptionSede')
      .leftJoin('ticket.bultos', 'bultos')
      .leftJoin('c.sedeEmision', 'emissionSede')
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    const scopeSedeId = effectiveSedeId(user, params.sedeId)
    if (params.sedeId && !isGlobalRole(user) && scopeSedeId !== params.sedeId) throw new ForbiddenException({ statusCode: 403, code: 'SEDE_FORBIDDEN', message: 'No puede consultar comprobantes de otra sede', details: { sedeId: params.sedeId } })
    if (scopeSedeId) qb.andWhere('c.sede_emision_id = :scopeSedeId', { scopeSedeId })
    if (params.tipo) qb.andWhere('c.tipo = :tipo', { tipo: params.tipo })
    if (params.estado) qb.andWhere('c.estado = :estado', { estado: params.estado })
    if (params.q) qb.andWhere('(c.serie ILIKE :q OR c.numero ILIKE :q OR ticket.numero_ticket ILIKE :q)', { q: `%${params.q}%` })
    const [data, total] = await qb.getManyAndCount()
    return { data, total, page, limit, pages: Math.ceil(total / limit), totalPages: Math.ceil(total / limit) }
  }

  async anular(id: string, motivo: string, user?: any) {
    if (!motivo?.trim()) throw new BadRequestException({ statusCode: 400, code: 'CANCEL_REASON_REQUIRED', message: 'El motivo de anulación es obligatorio', details: {} })
    return this.dataSource.transaction(async manager => {
      const comprobante = await manager.findOne(Comprobante, { where: { id }, relations: ['ticket', 'ticket.usuarioCreacion', 'ticket.sedeRecepcion', 'ticket.destino', 'ticket.bultos', 'usuario'] })
      if (!comprobante) throw new NotFoundException('Comprobante no encontrado')
      const ticket = comprobante.ticket
      if (!user || ![RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN].includes(user.rol as RolUsuario)) {
        throw new ForbiddenException({ statusCode: 403, code: 'DOCUMENT_VOID_ROLE_FORBIDDEN', message: 'Solo SUPERVISOR o SUPERADMIN pueden anular comprobantes', details: {} })
      }
      const emissionSedeId = comprobante.sedeEmisionId || ticket?.sedeRecepcionId || ticket?.usuarioCreacion?.sedeId
      if (!emissionSedeId && !isGlobalRole(user)) throw new ForbiddenException({ statusCode: 403, code: 'DOCUMENT_EMISSION_SITE_UNKNOWN', message: 'El comprobante no tiene sede de emisión determinable', details: { id } })
      assertSedeAccess(user, emissionSedeId, 'anular el comprobante')
      if (comprobante.estado === EstadoComprobante.ANULADO || comprobante.estado === 'ANULADO_MOCK') throw new BadRequestException({ statusCode: 409, code: 'DOCUMENT_ALREADY_VOIDED', message: 'El comprobante ya está anulado', details: { id } })
      if (comprobante.estado !== EstadoComprobante.EMITIDO) throw new BadRequestException({ statusCode: 409, code: 'DOCUMENT_STATE_INVALID', message: 'El comprobante no está en estado anulable', details: { estado: comprobante.estado } })
      const before = { estado: comprobante.estado }
      comprobante.estado = 'ANULADO_MOCK'
      const saved = await manager.save(Comprobante, comprobante)
      await manager.save(AuditLog, manager.create(AuditLog, { usuarioId: user?.sub, accion: 'COMPROBANTE_ANULADO_MOCK', entidad: 'Comprobante', entidadId: saved.id, antes: before, despues: { estado: saved.estado, motivo: motivo.trim() }, metadata: { ticketId: saved.ticket?.id, tipo: saved.tipo, serie: saved.serie, numero: saved.numero } }))
      return saved
    })
  }
}
