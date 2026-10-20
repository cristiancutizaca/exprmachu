import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditLog } from '../database/entities/audit-log.entity'
import { AuditoriaController } from './auditoria.controller'
import { AuditoriaService } from './auditoria.service'

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
})
export class AuditoriaModule {}
