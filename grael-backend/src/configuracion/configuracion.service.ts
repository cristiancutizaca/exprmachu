import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Configuracion } from '../database/entities/configuracion.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { RolUsuario } from '../database/entities/usuario.entity'

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(Configuracion) private readonly repo: Repository<Configuracion>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
  ) {}

  listar() { return this.repo.find({ order: { clave: 'ASC' } }) }

  async get(clave: string) {
    const c = await this.repo.findOneBy({ clave })
    if (!c) throw new NotFoundException(`Configuración '${clave}' no encontrada`)
    return c
  }

  private assertCanWrite(user: any) {
    if (![RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR].includes(user?.rol)) {
      throw new ForbiddenException({ statusCode: 403, code: 'CONFIGURATION_WRITE_FORBIDDEN', message: 'El rol no puede modificar configuración global', details: {} })
    }
  }

  async set(clave: string, valor: string, descripcion?: string, user?: any) {
    this.assertCanWrite(user)
    const ex = await this.repo.findOneBy({ clave })
    if (ex && ex.editable === false) throw new ForbiddenException({ statusCode: 403, code: 'CONFIGURATION_NOT_EDITABLE', message: `La configuración '${clave}' no es editable`, details: {} })
    const antes = ex ? { valor: ex.valor, descripcion: ex.descripcion } : null
    let saved: Configuracion
    if (ex) {
      ex.valor = valor
      if (descripcion !== undefined) ex.descripcion = descripcion
      saved = await this.repo.save(ex)
    } else {
      saved = await this.repo.save(this.repo.create({ clave, valor, descripcion: descripcion || '', tipo: 'string', editable: true }))
    }
    await this.auditRepo.save(this.auditRepo.create({ usuarioId: user?.sub, sedeId: user?.sedeId, accion: 'CONFIGURACION_MODIFICADA', entidad: 'Configuracion', entidadId: saved.id, antes, despues: { valor: saved.valor, descripcion: saved.descripcion }, metadata: { clave } }))
    return saved
  }

  async getAll() {
    const items = await this.repo.find()
    return Object.fromEntries(items.map(i => [i.clave, i.valor]))
  }

  async bulkUpdate(updates: { clave: string; valor: string }[], user?: any) {
    this.assertCanWrite(user)
    for (const u of updates) await this.set(u.clave, u.valor, undefined, user)
    return this.listar()
  }
}
