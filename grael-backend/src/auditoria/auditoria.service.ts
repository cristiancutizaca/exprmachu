import { ForbiddenException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from '../database/entities/audit-log.entity'
import { assertSedeAccess, isGlobalRole } from '../auth/sede-scope'
import { isSecretConfigKey } from '../configuracion/secret-config'

@Injectable()
export class AuditoriaService {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async listar(query: any, user?: any) {
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))
    const page = Math.max(1, Number(query.page) || 1)
    const where: any = {}
    if (!isGlobalRole(user)) {
      if (!user?.sedeId) throw new ForbiddenException('La auditoría requiere una sede asignada')
      where.sedeId = user.sedeId
    }
    if (query.sedeId) { assertSedeAccess(user, query.sedeId, 'consultar auditoría'); where.sedeId = query.sedeId }
    if (query.entidad) where.entidad = query.entidad
    if (query.accion) where.accion = query.accion
    const [data, total] = await this.repo.findAndCount({ where, order: { fechaHora: 'DESC' }, skip: (page - 1) * limit, take: limit })
    return {
      data: data.map(entry => {
        if (entry.entidad !== 'Configuracion') return entry
        const clave = entry.metadata?.clave
        return { ...entry, antes: null, despues: null, metadata: isSecretConfigKey(clave) ? null : { clave } }
      }),
      total, page, limit, totalPages: Math.ceil(total / limit),
    }
  }
}
