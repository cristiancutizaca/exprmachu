import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ComprobantesController } from './comprobantes.controller'
import { ComprobantesService }    from './comprobantes.service'
import { Comprobante } from '../database/entities/operaciones.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
@Module({ imports:[TypeOrmModule.forFeature([Comprobante, AuditLog])], controllers:[ComprobantesController], providers:[ComprobantesService] })
export class ComprobantesModule {}
