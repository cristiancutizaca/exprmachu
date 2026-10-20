import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DestinosController } from './destinos.controller'
import { DestinosService }    from './destinos.service'
import { Destino }            from '../database/entities/destino.entity'
@Module({ imports:[TypeOrmModule.forFeature([Destino])], controllers:[DestinosController], providers:[DestinosService], exports:[DestinosService] })
export class DestinosModule {}
