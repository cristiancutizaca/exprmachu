import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { Usuario, RolUsuario } from '../database/entities/usuario.entity'
import { assertSedeAccess, isGlobalRole } from '../auth/sede-scope'
import { assertCanAssignRole } from '../auth/role-policy'

@Injectable()
export class UsuariosService {
  constructor(@InjectRepository(Usuario) private repo: Repository<Usuario>) {}

  listar(user?: any) {
    const where = !isGlobalRole(user) && user?.sedeId ? { sedeId: user.sedeId } : undefined
    return this.repo.find({ where, select: ['id', 'username', 'nombre', 'apellido', 'email', 'telefono', 'rol', 'sede', 'sedeId', 'activo', 'createdAt'], order: { nombre: 'ASC' } })
  }

  async findById(id: string, user?: any) {
    const u = await this.repo.findOne({ where: { id }, select: ['id', 'username', 'nombre', 'apellido', 'email', 'telefono', 'rol', 'sede', 'sedeId', 'activo', 'createdAt', 'updatedAt'] })
    if (!u) throw new NotFoundException('Usuario no encontrado')
    assertSedeAccess(user, u.sedeId, 'consultar usuarios')
    return u
  }

  private assertCanManage(actor: any, targetSedeId: string | null | undefined, targetRole?: RolUsuario) {
    assertSedeAccess(actor, targetSedeId, 'administrar usuarios')
    assertCanAssignRole(actor?.rol, targetRole)
  }

  async crear(dto: any, actor: any) {
    const sedeId = dto.sedeId || actor?.sedeId
    this.assertCanManage(actor, sedeId, dto.rol)
    const ex = await this.repo.findOneBy({ username: dto.username })
    if (ex) throw new ConflictException(`Usuario '${dto.username}' ya existe`)
    const hash = await bcrypt.hash(dto.password, 10)
    const entity = this.repo.create({
      username: dto.username, password: hash, nombre: dto.nombre, apellido: dto.apellido,
      email: dto.email, telefono: dto.telefono, rol: dto.rol, sede: dto.sede, sedeId, activo: true,
    })
    const saved = await this.repo.save(entity)
    return this.findById(saved.id, actor)
  }

  async update(id: string, dto: any, actor: any) {
    const current = await this.repo.findOneBy({ id })
    if (!current) throw new NotFoundException('Usuario no encontrado')
    const targetSedeId = dto.sedeId === undefined ? current.sedeId : dto.sedeId
    const targetRole = dto.rol === undefined ? current.rol : dto.rol
    this.assertCanManage(actor, targetSedeId, targetRole)
    const patch: Partial<Usuario> = {}
    if (dto.username !== undefined) patch.username = dto.username
    if (dto.nombre !== undefined) patch.nombre = dto.nombre
    if (dto.apellido !== undefined) patch.apellido = dto.apellido
    if (dto.email !== undefined) patch.email = dto.email
    if (dto.telefono !== undefined) patch.telefono = dto.telefono
    if (dto.rol !== undefined) patch.rol = dto.rol
    if (dto.sede !== undefined) patch.sede = dto.sede
    if (dto.sedeId !== undefined) patch.sedeId = dto.sedeId
    if (dto.activo !== undefined) patch.activo = dto.activo
    if (dto.password !== undefined) patch.password = await bcrypt.hash(dto.password, 10)
    await this.repo.update(id, patch)
    return this.findById(id, actor)
  }

  async toggle(id: string, actor: any) {
    const u = await this.repo.findOneByOrFail({ id })
    this.assertCanManage(actor, u.sedeId, u.rol)
    u.activo = !u.activo
    await this.repo.save(u)
    return { id, activo: u.activo }
  }
}
