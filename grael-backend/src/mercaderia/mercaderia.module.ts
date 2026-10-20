import { Module } from '@nestjs/common'
import { MercaderiaController } from './mercaderia.controller'
import { MercaderiaService }    from './mercaderia.service'
@Module({ controllers:[MercaderiaController], providers:[MercaderiaService] })
export class MercaderiaModule {}
