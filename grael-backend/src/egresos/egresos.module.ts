import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EgresosController } from './egresos.controller'
import { EgresosService } from './egresos.service'
import { Egreso } from '../database/entities/egreso.entity'
import { CajaSesion, MovimientoCaja } from '../database/entities/caja.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { Sede } from '../database/entities/sede.entity'
import { AuditLog } from '../database/entities/audit-log.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Egreso, CajaSesion, MovimientoCaja, Usuario, Sede, AuditLog])],
  controllers: [EgresosController],
  providers: [EgresosService],
  exports: [EgresosService],
})
export class EgresosModule {}
