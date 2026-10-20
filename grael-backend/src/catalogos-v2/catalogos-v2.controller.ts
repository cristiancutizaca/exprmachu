import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { CatalogosV2Service } from './catalogos-v2.service'

@ApiTags('Catálogos V4')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CatalogosV2Controller {
  constructor(private readonly service: CatalogosV2Service) {}

  @Get('sedes') sedes(@Query() query: any, @Request() req: any) { return this.service.sedes(query, req.user) }
  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('sedes') crearSede(@Body() body: any) { return this.service.crearSede(body) }
  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('sedes/:id') actualizarSede(@Param('id') id: string, @Body() body: any) { return this.service.actualizarSede(id, body) }

  @Get('almacenes') almacenes(@Query() query: any, @Request() req: any) { return this.service.almacenes(query, req.user) }
  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('almacenes') crearAlmacen(@Body() body: any, @Request() req: any) { return this.service.crearAlmacen(body, req.user) }
  @Get('almacenes/:almacenId/ubicaciones') ubicaciones(@Param('almacenId') almacenId: string, @Request() req: any) { return this.service.ubicaciones(almacenId, req.user) }
  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('ubicaciones-almacen') crearUbicacion(@Body() body: any, @Request() req: any) { return this.service.crearUbicacion(body, req.user) }

  @Get('vehiculos') vehiculos(@Query() query: any, @Request() req: any) { return this.service.vehiculos(query, req.user) }
  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('vehiculos') crearVehiculo(@Body() body: any, @Request() req: any) { return this.service.crearVehiculo(body, req.user) }
  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('vehiculos/:id') actualizarVehiculo(@Param('id') id: string, @Body() body: any, @Request() req: any) { return this.service.actualizarVehiculo(id, body, req.user) }

  @Get('conductores') conductores(@Query() query: any, @Request() req: any) { return this.service.conductores(query, req.user) }
  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('conductores') crearConductor(@Body() body: any, @Request() req: any) { return this.service.crearConductor(body, req.user) }
  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('conductores/:id') actualizarConductor(@Param('id') id: string, @Body() body: any, @Request() req: any) { return this.service.actualizarConductor(id, body, req.user) }

  @Get('tarifas') tarifas(@Query() query: any, @Request() req: any) { return this.service.tarifas(query, req.user) }
  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('tarifas') crearTarifa(@Body() body: any) { return this.service.crearTarifa(body) }
  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('tarifas/:id') actualizarTarifa(@Param('id') id: string, @Body() body: any) { return this.service.actualizarTarifa(id, body) }
}
