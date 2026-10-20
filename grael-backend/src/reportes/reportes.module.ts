import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ReportesController } from './reportes.controller'
import { ReportesService }    from './reportes.service'
import { Ticket }  from '../database/entities/ticket.entity'
import { Pago }    from '../database/entities/operaciones.entity'
import { Cliente } from '../database/entities/cliente.entity'
@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Pago, Cliente])],
  controllers: [ReportesController],
  providers:   [ReportesService],
})
export class ReportesModule {}
