import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, ILike, Or } from 'typeorm'
import { Cliente } from '../database/entities/cliente.entity'

@Injectable()
export class ClientesService {
  constructor(@InjectRepository(Cliente) private repo: Repository<Cliente>) {}

  async buscar(q: string) {
    if (!q) return this.repo.find({ take: 20, order: { razonSocial:'ASC' } })
    return this.repo.find({
      where: [{ razonSocial: ILike(`%${q}%`) }, { ruc: ILike(`%${q}%`) }, { dni: ILike(`%${q}%`) }],
      take: 20,
    })
  }

  async findById(id: string) {
    const c = await this.repo.findOneBy({ id })
    if (!c) throw new NotFoundException(`Cliente ${id} no encontrado`)
    return c
  }

  async byDniRuc(val: string) {
    return this.repo.findOne({ where: [{ ruc: val }, { dni: val }] })
  }

  async crear(dto: any) { return this.repo.save(this.repo.create(dto)) }

  async update(id: string, dto: any) {
    await this.findById(id)
    await this.repo.update(id, dto)
    return this.findById(id)
  }
}
