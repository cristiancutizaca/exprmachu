import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DestinosService } from './destinos.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
@ApiTags('Destinos') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('destinos')
export class DestinosController {
  constructor(private svc: DestinosService) {}
  @Get()      listar()                              { return this.svc.listar() }
  @Get(':id') findById(@Param('id') id: string)     { return this.svc.findById(id) }
}
