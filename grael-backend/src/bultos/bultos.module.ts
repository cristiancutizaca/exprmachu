import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BultosController } from './bultos.controller'
import { BultosService } from './bultos.service'
import { Bulto } from '../database/entities/bulto.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { TrackingEvento } from '../database/entities/tracking-evento.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { AuditLog } from '../database/entities/audit-log.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Bulto, Ticket, TrackingEvento, Usuario, AuditLog])],
  controllers: [BultosController],
  providers: [BultosService],
  exports: [BultosService],
})
export class BultosModule {}
