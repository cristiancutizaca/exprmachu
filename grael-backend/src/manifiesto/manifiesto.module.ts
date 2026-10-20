import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ManifiestoController } from './manifiesto.controller'
import { ManifiestoService }    from './manifiesto.service'
import { Manifiesto } from '../database/entities/operaciones.entity'
import { Destino }    from '../database/entities/destino.entity'
import { Ticket } from '../database/entities/ticket.entity'
import { Bulto } from '../database/entities/bulto.entity'
import { Vehiculo, Conductor } from '../database/entities/flota.entity'
import { Usuario } from '../database/entities/usuario.entity'
import { TrackingEvento } from '../database/entities/tracking-evento.entity'
import { DesembarqueSesion, DesembarqueBulto } from '../database/entities/desembarque-fisico.entity'
@Module({ imports:[TypeOrmModule.forFeature([Manifiesto, Destino, Ticket, Bulto, Vehiculo, Conductor, Usuario, TrackingEvento, DesembarqueSesion, DesembarqueBulto])], controllers:[ManifiestoController], providers:[ManifiestoService] })
export class ManifiestoModule {}
