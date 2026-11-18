import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ComprobantesController } from './comprobantes.controller'
import { ComprobantesService }    from './comprobantes.service'
import { CpeFiscalController } from './cpe-fiscal.controller'
import { CpeFiscalService } from './cpe-fiscal.service'
import { SunatSchema } from '../sunat/sunat-xml'
import { Comprobante } from '../database/entities/operaciones.entity'
import { AuditLog } from '../database/entities/audit-log.entity'
@Module({ imports:[TypeOrmModule.forFeature([Comprobante, AuditLog])], controllers:[CpeFiscalController, ComprobantesController], providers:[ComprobantesService, CpeFiscalService, SunatSchema] })
export class ComprobantesModule {}
