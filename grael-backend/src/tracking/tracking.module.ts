import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TrackingController } from './tracking.controller'
import { TrackingService } from './tracking.service'
import { TrackingEvento } from '../database/entities/tracking-evento.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { Bulto } from '../database/entities/bulto.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { Sede } from '../database/entities/sede.entity'
import { Almacen, UbicacionAlmacen } from '../database/entities/almacen.entity'
import { Manifiesto } from '../database/entities/operaciones.entity'
import { AuditLog } from '../database/entities/audit-log.entity'

@Module({
  imports: [TypeOrmModule.forFeature([TrackingEvento, Ticket, Bulto, Usuario, Sede, Almacen, UbicacionAlmacen, Manifiesto, AuditLog])],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
