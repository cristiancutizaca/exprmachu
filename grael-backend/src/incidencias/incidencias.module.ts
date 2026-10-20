import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { IncidenciasController } from './incidencias.controller'
import { IncidenciasService } from './incidencias.service'
import { Incidencia } from '../database/entities/incidencia.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { Bulto } from '../database/entities/bulto.entity'
import { TrackingEvento } from '../database/entities/tracking-evento.entity'
import { MovimientoAlmacen } from '../database/entities/movimiento-almacen.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { AuditLog } from '../database/entities/audit-log.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Incidencia, Ticket, Bulto, TrackingEvento, MovimientoAlmacen, Usuario, AuditLog])],
  controllers: [IncidenciasController],
  providers: [IncidenciasService],
  exports: [IncidenciasService],
})
export class IncidenciasModule {}
