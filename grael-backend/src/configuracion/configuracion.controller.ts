import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ConfiguracionService } from './configuracion.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { BulkConfiguracionDto, SetConfiguracionDto } from '../common/dto/configuracion.dto'

@ApiTags('Configuracion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly service: ConfiguracionService) {}

  @Roles(RolUsuario.AUDITOR, RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get() listar() { return this.service.listar() }

  @Roles(RolUsuario.AUDITOR, RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('all') getAll() { return this.service.getAll() }

  @Roles(RolUsuario.AUDITOR, RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':clave') get(@Param('clave') clave: string) { return this.service.get(clave) }

  @Roles(RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('bulk') bulk(@Body() dto: BulkConfiguracionDto, @Request() req: any) { return this.service.bulkUpdate(dto.updates, req.user) }

  @Roles(RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':clave') set(@Param('clave') clave: string, @Body() dto: SetConfiguracionDto, @Request() req: any) { return this.service.set(clave, dto.valor, dto.descripcion, req.user) }
}
