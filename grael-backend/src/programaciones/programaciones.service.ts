import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Programacion } from '../database/entities/programacion.entity'
import { Destino }       from '../database/entities/destino.entity'
@Injectable()
export class ProgramacionesService {
  constructor(
    @InjectRepository(Programacion) private repo: Repository<Programacion>,
    @InjectRepository(Destino)      private destRepo: Repository<Destino>,
  ) {}
  listar() { return this.repo.find({ where:{activo:true}, relations:['origen','destino'], order:{horaSalida:'ASC'} }) }
  async findById(id: string) {
    const p = await this.repo.findOne({ where:{id}, relations:['origen','destino'] })
    if (!p) throw new NotFoundException()
    return p
  }
  async crear(dto: any) {
    const origen  = await this.destRepo.findOneByOrFail({ id:dto.origenId })
    const destino = await this.destRepo.findOneByOrFail({ id:dto.destinoId })
    return this.repo.save(this.repo.create({ ...dto, origen, destino }))
  }
  async update(id: string, dto: any) { await this.findById(id); await this.repo.update(id, dto); return this.findById(id) }
  remove(id: string) { return this.repo.update(id, { activo:false }) }
}
