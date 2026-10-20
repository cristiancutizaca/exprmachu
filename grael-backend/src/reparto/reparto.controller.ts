import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { IntentoRepartoDto, RetornoRepartoDto } from '../common/dto/reparto.dto'
import { RepartoService } from './reparto.service'

@ApiTags('Reparto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reparto')
export class RepartoController {
  constructor(private readonly service: RepartoService) {}

  @Get() listar(@Query() query: any, @Request() req: any) { return this.service.listar(query, req.user) }
  @Get(':id') detalle(@Param('id') id: string, @Request() req: any) { return this.service.detalle(id, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.OPERADOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post() crear(@Body() body: any, @Request() req: any) { return this.service.crear(body, req.user.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.REPARTIDOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/iniciar') iniciar(@Param('id') id: string, @Request() req: any) { return this.service.iniciar(id, req.user.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.REPARTIDOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('detalle/:id/intento') intento(@Param('id') id: string, @Body() body: IntentoRepartoDto, @Request() req: any) { return this.service.registrarIntento(id, body, req.user.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.REPARTIDOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/retorno') retorno(@Param('id') id: string, @Body() body: RetornoRepartoDto, @Request() req: any) { return this.service.retorno(id, body, req.user.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.REPARTIDOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/finalizar') finalizar(@Param('id') id: string, @Request() req: any) { return this.service.finalizar(id, req.user.sub, req.user) }
}
