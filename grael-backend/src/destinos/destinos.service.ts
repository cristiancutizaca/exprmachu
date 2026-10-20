import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Destino } from '../database/entities/destino.entity'
@Injectable()
export class DestinosService {
  constructor(@InjectRepository(Destino) private repo: Repository<Destino>) {}
  listar()             { return this.repo.find({ where:{activo:true}, order:{nombre:'ASC'} }) }
  findById(id: string) { return this.repo.findOneBy({ id }) }
}
