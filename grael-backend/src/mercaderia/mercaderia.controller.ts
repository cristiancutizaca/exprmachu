import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { MercaderiaService } from './mercaderia.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
@ApiTags('Mercaderia') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('mercaderia')
export class MercaderiaController {
  constructor(private svc: MercaderiaService) {}
  @Get('tipos')    tipos() { return this.svc.tiposLista() }
  @Get('calcular') calcular(@Query('tipo') tipo: string, @Query('peso') peso: string, @Query('cantidad') cantidad: string) {
    return this.svc.calcularCosto(tipo, parseFloat(peso)||0, parseInt(cantidad)||1)
  }
}
