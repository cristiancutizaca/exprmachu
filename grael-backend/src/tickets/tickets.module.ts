import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TicketsController } from './tickets.controller'
import { TicketsService }    from './tickets.service'
import { Ticket }            from '../database/entities/ticket.entity'
import { GuiaRemision, MercaderiaItem } from '../database/entities/mercaderia-item.entity'
import { Pago }              from '../database/entities/operaciones.entity'
import { Destino }           from '../database/entities/destino.entity'
import { Cliente }           from '../database/entities/cliente.entity'
import { Programacion }      from '../database/entities/programacion.entity'
import { TicketWorkflowService } from './ticket-workflow.service'
import { TicketDeliveryStateService } from './ticket-delivery-state.service'
import { Bulto }          from '../database/entities/bulto.entity'
import { TrackingEvento } from '../database/entities/tracking-evento.entity'
import { Tarifa }         from '../database/entities/tarifa.entity'
import { Configuracion }  from '../database/entities/configuracion.entity'
import { AuditLog }       from '../database/entities/audit-log.entity'
import { CajaSesion }     from '../database/entities/caja.entity'
@Module({
  imports: [TypeOrmModule.forFeature([Ticket, GuiaRemision, MercaderiaItem, Pago, Destino, Cliente, Programacion, Bulto, TrackingEvento, Tarifa, Configuracion, AuditLog, CajaSesion])],
  controllers: [TicketsController],
  providers:   [TicketsService, TicketWorkflowService, TicketDeliveryStateService],
  exports:     [TicketsService, TicketWorkflowService, TicketDeliveryStateService],
})
export class TicketsModule {}
