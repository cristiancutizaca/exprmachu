import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfiguracionController } from './configuracion.controller'
import { ConfiguracionService }    from './configuracion.service'
import { Configuracion }           from '../database/entities/configuracion.entity'
import { AuditLog }                 from '../database/entities/audit-log.entity'
@Module({ imports:[TypeOrmModule.forFeature([Configuracion, AuditLog])], controllers:[ConfiguracionController], providers:[ConfiguracionService] })
export class ConfiguracionModule {}
