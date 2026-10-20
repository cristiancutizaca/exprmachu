import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Sede } from '../database/entities/sede.entity'
import { Almacen, UbicacionAlmacen } from '../database/entities/almacen.entity'
import { Vehiculo } from '../database/entities/flota.entity'
import { Conductor } from '../database/entities/flota.entity'
import { Tarifa } from '../database/entities/tarifa.entity'
import { assertSedeAccess, effectiveSedeId, isGlobalRole } from '../auth/sede-scope'

@Injectable()
export class CatalogosV2Service {
  constructor(
    @InjectRepository(Sede) private readonly sedeRepo: Repository<Sede>,
    @InjectRepository(Almacen) private readonly almacenRepo: Repository<Almacen>,
    @InjectRepository(UbicacionAlmacen) private readonly ubicacionRepo: Repository<UbicacionAlmacen>,
    @InjectRepository(Vehiculo) private readonly vehiculoRepo: Repository<Vehiculo>,
    @InjectRepository(Conductor) private readonly conductorRepo: Repository<Conductor>,
    @InjectRepository(Tarifa) private readonly tarifaRepo: Repository<Tarifa>,
  ) {}

  sedes(query: any, user?: any) {
    const qb = this.sedeRepo.createQueryBuilder('s').orderBy('s.nombre', 'ASC')
    const scopeSedeId = effectiveSedeId(user, query.sedeId)
    if (!isGlobalRole(user)) {
      if (query.sedeId && scopeSedeId !== query.sedeId) assertSedeAccess(user, query.sedeId, 'consultar')
      if (scopeSedeId) qb.andWhere('s.id = :scopeSedeId', { scopeSedeId })
    } else if (scopeSedeId) qb.andWhere('s.id = :scopeSedeId', { scopeSedeId })
    if (query.q) qb.andWhere('(s.codigo ILIKE :q OR s.nombre ILIKE :q)', { q: `%${query.q}%` })
    if (query.activo !== undefined && query.activo !== '') qb.andWhere('s.activo = :activo', { activo: query.activo === 'true' })
    return qb.getMany()
  }

  async crearSede(dto: any) { return this.sedeRepo.save(this.sedeRepo.create(dto)) }
  async actualizarSede(id: string, dto: any) {
    const entity = await this.sedeRepo.preload({ id, ...dto })
    if (!entity) throw new NotFoundException('Sede no encontrada')
    return this.sedeRepo.save(entity)
  }

  almacenes(query: any, user?: any) {
    const qb = this.almacenRepo.createQueryBuilder('a').leftJoinAndSelect('a.sede', 's').orderBy('a.nombre', 'ASC')
    const scopeSedeId = effectiveSedeId(user, query.sedeId)
    if (!isGlobalRole(user) && query.sedeId && scopeSedeId !== query.sedeId) assertSedeAccess(user, query.sedeId, 'consultar almacenes')
    if (scopeSedeId) qb.andWhere('a.sede_id = :scopeSedeId', { scopeSedeId })
    if (query.estado) qb.andWhere('a.estado = :estado', { estado: query.estado })
    return qb.getMany()
  }

  async crearAlmacen(dto: any, user?: any) {
    const sedeId = effectiveSedeId(user, dto.sedeId)
    assertSedeAccess(user, sedeId, 'crear almacenes')
    return this.almacenRepo.save(this.almacenRepo.create({ ...dto, sedeId }))
  }
  async ubicaciones(almacenId: string, user?: any) {
    const almacen = await this.almacenRepo.findOneBy({ id: almacenId })
    if (!almacen) throw new NotFoundException('Almacén no encontrado')
    assertSedeAccess(user, almacen.sedeId, 'consultar ubicaciones')
    return this.ubicacionRepo.find({ where: { almacenId }, order: { codigo: 'ASC' } })
  }
  async crearUbicacion(dto: any, user?: any) {
    const almacen = await this.almacenRepo.findOneBy({ id: dto.almacenId })
    if (!almacen) throw new NotFoundException('Almacén no encontrado')
    assertSedeAccess(user, almacen.sedeId, 'crear ubicaciones')
    return this.ubicacionRepo.save(this.ubicacionRepo.create(dto))
  }

  vehiculos(query: any, user?: any) {
    const qb = this.vehiculoRepo.createQueryBuilder('v').orderBy('v.placa', 'ASC')
    const scopeSedeId = effectiveSedeId(user, query.sedeId)
    if (!isGlobalRole(user) && query.sedeId && scopeSedeId !== query.sedeId) assertSedeAccess(user, query.sedeId, 'consultar vehículos')
    if (scopeSedeId) qb.andWhere('v.sede_id = :scopeSedeId', { scopeSedeId })
    if (query.q) qb.andWhere('(v.placa ILIKE :q OR v.marca ILIKE :q OR v.modelo ILIKE :q)', { q: `%${query.q}%` })
    if (query.estado) qb.andWhere('v.estado = :estado', { estado: query.estado })
    return qb.getMany()
  }

  async crearVehiculo(dto: any, user?: any) {
    const sedeId = effectiveSedeId(user, dto.sedeId)
    assertSedeAccess(user, sedeId, 'crear vehículos')
    return this.vehiculoRepo.save(this.vehiculoRepo.create({ ...dto, sedeId }))
  }
  async actualizarVehiculo(id: string, dto: any, user?: any) {
    const existing = await this.vehiculoRepo.findOneBy({ id })
    if (!existing) throw new NotFoundException('Vehículo no encontrado')
    assertSedeAccess(user, existing.sedeId, 'actualizar vehículos')
    const entity = await this.vehiculoRepo.preload({ id, ...dto, sedeId: existing.sedeId })
    return this.vehiculoRepo.save(entity!)
  }

  conductores(query: any, user?: any) {
    const qb = this.conductorRepo.createQueryBuilder('c').orderBy('c.apellidos', 'ASC')
    const scopeSedeId = effectiveSedeId(user, query.sedeId)
    if (!isGlobalRole(user) && query.sedeId && scopeSedeId !== query.sedeId) assertSedeAccess(user, query.sedeId, 'consultar conductores')
    if (scopeSedeId) qb.andWhere('c.sede_id = :scopeSedeId', { scopeSedeId })
    if (query.q) qb.andWhere('(c.dni ILIKE :q OR c.nombres ILIKE :q OR c.apellidos ILIKE :q)', { q: `%${query.q}%` })
    if (query.estado) qb.andWhere('c.estado = :estado', { estado: query.estado })
    return qb.getMany()
  }

  async crearConductor(dto: any, user?: any) {
    const sedeId = effectiveSedeId(user, dto.sedeId)
    assertSedeAccess(user, sedeId, 'crear conductores')
    return this.conductorRepo.save(this.conductorRepo.create({ ...dto, sedeId }))
  }
  async actualizarConductor(id: string, dto: any, user?: any) {
    const existing = await this.conductorRepo.findOneBy({ id })
    if (!existing) throw new NotFoundException('Conductor no encontrado')
    assertSedeAccess(user, existing.sedeId, 'actualizar conductores')
    const entity = await this.conductorRepo.preload({ id, ...dto, sedeId: existing.sedeId })
    return this.conductorRepo.save(entity!)
  }

  tarifas(query: any, _user?: any) {
    const qb = this.tarifaRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.origen', 'origen')
      .leftJoinAndSelect('t.destino', 'destino')
      .orderBy('t.vigenciaDesde', 'DESC')
    if (query.origenId) qb.andWhere('t.origenId = :origenId', { origenId: query.origenId })
    if (query.destinoId) qb.andWhere('t.destinoId = :destinoId', { destinoId: query.destinoId })
    if (query.activo !== undefined && query.activo !== '') qb.andWhere('t.activo = :activo', { activo: query.activo === 'true' })
    return qb.getMany()
  }

  async crearTarifa(dto: any) { return this.tarifaRepo.save(this.tarifaRepo.create({ ...dto, vigenciaDesde: new Date(dto.vigenciaDesde) })) }
  async actualizarTarifa(id: string, dto: any) {
    const entity = await this.tarifaRepo.preload({ id, ...dto, ...(dto.vigenciaDesde ? { vigenciaDesde: new Date(dto.vigenciaDesde) } : {}) })
    if (!entity) throw new NotFoundException('Tarifa no encontrada')
    return this.tarifaRepo.save(entity)
  }
}
