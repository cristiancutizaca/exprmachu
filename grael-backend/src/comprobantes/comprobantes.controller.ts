import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Request, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ComprobantesService } from './comprobantes.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { AnularComprobanteDto, ComprobanteQueryDto } from '../common/dto/comprobante.dto'

@ApiTags('Comprobantes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comprobantes')
export class ComprobantesController {
  constructor(private readonly service: ComprobantesService) {}

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO, RolUsuario.OPERADOR, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  listar(@Query() query: ComprobanteQueryDto, @Request() req: any) { return this.service.listar(query, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/anular')
  anular(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AnularComprobanteDto, @Request() req: any) { return this.service.anular(id, dto.motivo, req.user) }
}
