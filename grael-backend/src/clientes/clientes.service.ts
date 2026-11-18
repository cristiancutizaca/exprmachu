import { BadRequestException, ServiceUnavailableException, Injectable, NotFoundException } from '@nestjs/common'
import { validRuc } from '../sunat/sunat-config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, ILike, Or } from 'typeorm'
import { Cliente } from '../database/entities/cliente.entity'

@Injectable()
export class ClientesService {
  constructor(@InjectRepository(Cliente) private repo: Repository<Cliente>) {}

  async consultarRuc(ruc: string) {
    if (!validRuc(ruc)) throw new BadRequestException('Ingrese un RUC válido de 11 dígitos')
    const [result] = await this.repo.query(`
      WITH snapshot AS (SELECT MAX(fecha_padron) AS fecha FROM padron_ruc)
      SELECT snapshot.fecha::text AS "fechaPadron", CASE WHEN p.ruc IS NULL THEN NULL
        ELSE jsonb_build_object('ruc', p.ruc, 'razonSocial', p.razon_social, 'estado', p.estado, 'condicion', p.condicion) END AS registro
      FROM snapshot LEFT JOIN padron_ruc p ON p.ruc = $1 AND p.fecha_padron = snapshot.fecha
    `, [ruc])
    if (!result?.fechaPadron) throw new ServiceUnavailableException('Aún no se ha importado el padrón reducido de SUNAT')
    return { fuente: 'PADRON_REDUCIDO_SUNAT', ...result }
  }

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
