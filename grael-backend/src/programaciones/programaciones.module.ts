import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProgramacionesController } from './programaciones.controller'
import { ProgramacionesService }    from './programaciones.service'
import { Programacion } from '../database/entities/programacion.entity'
import { Destino }       from '../database/entities/destino.entity'
@Module({ imports:[TypeOrmModule.forFeature([Programacion,Destino])], controllers:[ProgramacionesController], providers:[ProgramacionesService], exports:[ProgramacionesService] })
export class ProgramacionesModule {}
