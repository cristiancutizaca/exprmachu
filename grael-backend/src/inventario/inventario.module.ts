import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InventarioController } from './inventario.controller'
import { InventarioService } from './inventario.service'
import { Bulto } from '../database/entities/bulto.entity'
import { MovimientoAlmacen } from '../database/entities/movimiento-almacen.entity'
import { Almacen, UbicacionAlmacen } from '../database/entities/almacen.entity'
import { TrackingEvento } from '../database/entities/tracking-evento.entity'
import { Usuario } from '../database/entities/usuario.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Bulto, MovimientoAlmacen, Almacen, UbicacionAlmacen, TrackingEvento, Usuario])],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService],
})
export class InventarioModule {}
