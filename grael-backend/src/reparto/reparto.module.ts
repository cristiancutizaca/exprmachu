import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RepartoController } from './reparto.controller'
import { RepartoService } from './reparto.service'
import { PlanillaReparto, PlanillaRepartoDetalle } from '../database/entities/reparto.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { Bulto } from '../database/entities/bulto.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { Vehiculo } from '../database/entities/flota.entity'
import { Sede } from '../database/entities/sede.entity'
import { TrackingEvento } from '../database/entities/tracking-evento.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { MovimientoAlmacen } from '../database/entities/movimiento-almacen.entity'
import { TicketsModule } from '../tickets/tickets.module'

@Module({
  imports: [TicketsModule, TypeOrmModule.forFeature([PlanillaReparto, PlanillaRepartoDetalle, Ticket, Bulto, Usuario, Vehiculo, Sede, TrackingEvento, AuditLog, MovimientoAlmacen])],
  controllers: [RepartoController],
  providers: [RepartoService],
  exports: [RepartoService],
})
export class RepartoModule {}
