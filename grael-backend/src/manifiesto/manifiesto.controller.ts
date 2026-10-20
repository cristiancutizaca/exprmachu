import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ManifiestoService } from './manifiesto.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { AddTicketsManifiestoDto, AssignManifiestoFleetDto, ChangeManifiestoStateDto, CreateManifiestoDto, LoadManifiestoBultoDto, ManifiestoQueryDto } from '../common/dto/manifiesto.dto'

@ApiTags('Manifiesto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('manifiesto')
export class ManifiestoController {
  constructor(private readonly service: ManifiestoService) {}

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.ALMACEN, RolUsuario.REPARTIDOR, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get() listar(@Query() query: ManifiestoQueryDto, @Request() req: any) { return this.service.listar(query, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.ALMACEN, RolUsuario.REPARTIDOR, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id') findById(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return this.service.findById(id, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post() crear(@Body() body: CreateManifiestoDto, @Request() req: any) { return this.service.crear(body, req.user?.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/tickets') agregarTickets(@Param('id', ParseUUIDPipe) id: string, @Body() body: AddTicketsManifiestoDto, @Request() req: any) { return this.service.agregarTickets(id, body.ticketIds, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.ALMACEN, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id/carga') resumenCarga(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return this.service.resumenCarga(id, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id/llegada/resumen') resumenLlegada(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return this.service.resumenLlegada(id, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.ALMACEN, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/llegada') llegada(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return this.service.llegada(id, req.user?.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.ALMACEN, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/carga/bulto') cargarBulto(@Param('id', ParseUUIDPipe) id: string, @Body() body: LoadManifiestoBultoDto, @Request() req: any) { return this.service.cargarBulto(id, body.codigo, req.user?.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/flota') asignarFlota(@Param('id', ParseUUIDPipe) id: string, @Body() body: AssignManifiestoFleetDto, @Request() req: any) { return this.service.asignarFlota(id, body, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/estado') cambiarEstado(@Param('id', ParseUUIDPipe) id: string, @Body() body: ChangeManifiestoStateDto, @Request() req: any) { return this.service.cambiarEstado(id, body.estado, req.user, body.motivo) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/despachar') despachar(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return this.service.despachar(id, req.user?.sub, req.user) }
}
