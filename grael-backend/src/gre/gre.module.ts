import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GreController } from './gre.controller'
import { GreService } from './gre.service'
import { Ticket } from '../database/entities/ticket.entity'
import { Comprobante } from '../database/entities/operaciones.entity'
import { GreDocumento } from '../database/entities/gre-documento.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
import { SerieDocumento } from '../database/entities/serie-documento.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Comprobante, GreDocumento, AuditLog, SerieDocumento])],
  controllers: [GreController],
  providers: [GreService],
  exports: [GreService],
})
export class GreModule {}
