import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ProgramacionesService } from './programaciones.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'

@ApiTags('Programaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('programaciones')
export class ProgramacionesController {
  constructor(private readonly service: ProgramacionesService) {}

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.ALMACEN, RolUsuario.REPARTIDOR, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get() listar() { return this.service.listar() }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.ALMACEN, RolUsuario.REPARTIDOR, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id') findById(@Param('id') id: string) { return this.service.findById(id) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post() crear(@Body() dto: any) { return this.service.crear(dto) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id) }
}
