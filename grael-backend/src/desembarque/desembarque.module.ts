import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DesembarqueController } from './desembarque.controller'
import { DesembarqueService }    from './desembarque.service'
import { Desembarque } from '../database/entities/operaciones.entity'
import { Ticket }      from '../database/entities/ticket.entity'
import { Bulto }       from '../database/entities/bulto.entity'
import { TrackingEvento } from '../database/entities/tracking-evento.entity'
import { Usuario }      from '../database/entities/usuario.entity'
import { Incidencia } from '../database/entities/incidencia.entity'
import { MovimientoAlmacen } from '../database/entities/movimiento-almacen.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { DesembarqueSesion, DesembarqueBulto } from '../database/entities/desembarque-fisico.entity'
@Module({
  imports: [TypeOrmModule.forFeature([Desembarque, DesembarqueSesion, DesembarqueBulto, Ticket, Bulto, TrackingEvento, Usuario, Incidencia, MovimientoAlmacen, AuditLog])],
  controllers: [DesembarqueController],
  providers:   [DesembarqueService],
})
export class DesembarqueModule {}
