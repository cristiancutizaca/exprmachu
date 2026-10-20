import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PagosController } from './pagos.controller'
import { PagosService }    from './pagos.service'
import { Pago }            from '../database/entities/operaciones.entity'
import { CajaSesion, MovimientoCaja } from '../database/entities/caja.entity'
import { Sede }             from '../database/entities/sede.entity'
import { Usuario }          from '../database/entities/usuario.entity'
import { AuditLog }         from '../database/entities/audit-log.entity'
@Module({
  imports: [TypeOrmModule.forFeature([Pago, CajaSesion, MovimientoCaja, Sede, Usuario, AuditLog])],
  controllers: [PagosController],
  providers:   [PagosService],
  exports:     [PagosService],
})
export class PagosModule {}
