import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { MercaderiaService } from './mercaderia.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
@ApiTags('Mercaderia') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('mercaderia')
export class MercaderiaController {
  constructor(private svc: MercaderiaService) {}
  @Get('tipos')    tipos() { return this.svc.tiposLista() }
  @Get('calcular') calcular(@Query('tipo') tipo: string, @Query('peso') peso: string, @Query('cantidad') cantidad: string,
    @Query('origenId') origenId?: string, @Query('destinoId') destinoId?: string, @Query('tipoEntrega') entrega?: string) {
    return this.svc.calcularCosto(tipo, Number(peso), Number(cantidad ?? 1), origenId, destinoId, entrega)
  }
}
