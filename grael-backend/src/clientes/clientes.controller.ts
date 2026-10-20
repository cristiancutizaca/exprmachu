import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ClientesService } from './clientes.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.CAJERO, RolUsuario.ALMACEN, RolUsuario.REPARTIDOR, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('buscar') buscar(@Query('q') q: string) { return this.service.buscar(q || '') }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.CAJERO, RolUsuario.ALMACEN, RolUsuario.REPARTIDOR, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('dni-ruc/:val') byDniRuc(@Param('val') val: string) { return this.service.byDniRuc(val) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.CAJERO, RolUsuario.ALMACEN, RolUsuario.REPARTIDOR, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id') findById(@Param('id') id: string) { return this.service.findById(id) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post() crear(@Body() dto: any) { return this.service.crear(dto) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto) }
}
