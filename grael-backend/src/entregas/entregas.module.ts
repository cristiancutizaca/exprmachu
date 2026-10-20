import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EntregasController } from './entregas.controller'
import { EntregasService } from './entregas.service'
import { Entrega } from '../database/entities/entrega.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { Bulto } from '../database/entities/bulto.entity'
import { TrackingEvento } from '../database/entities/tracking-evento.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { TicketsModule } from '../tickets/tickets.module'

@Module({
  imports: [TicketsModule, TypeOrmModule.forFeature([Entrega, Ticket, Bulto, TrackingEvento, Usuario, AuditLog])],
  controllers: [EntregasController],
  providers: [EntregasService],
  exports: [EntregasService],
})
export class EntregasModule {}
