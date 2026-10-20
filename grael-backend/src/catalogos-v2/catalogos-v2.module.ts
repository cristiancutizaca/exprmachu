import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CatalogosV2Controller } from './catalogos-v2.controller'
import { CatalogosV2Service } from './catalogos-v2.service'
import { Sede } from '../database/entities/sede.entity'
import { Almacen, UbicacionAlmacen } from '../database/entities/almacen.entity'
import { Vehiculo, Conductor } from '../database/entities/flota.entity'
import { Tarifa } from '../database/entities/tarifa.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Sede, Almacen, UbicacionAlmacen, Vehiculo, Conductor, Tarifa])],
  controllers: [CatalogosV2Controller],
  providers: [CatalogosV2Service],
  exports: [CatalogosV2Service],
})
export class CatalogosV2Module {}
