import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DesembarqueService } from './desembarque.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { AbrirDesembarqueSesionDto, CerrarDesembarqueSesionDto, DesembarqueEntregaDto, DesembarqueObservacionDto, EscanearDesembarqueBultoDto } from '../common/dto/desembarque.dto'

@ApiTags('Desembarque')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('desembarque')
export class DesembarqueController {
  constructor(private readonly service: DesembarqueService) {}

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN, RolUsuario.OPERADOR, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get() listar(@Query() query: any, @Request() req: any) { return this.service.listar(query, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('sesiones') abrirSesion(@Body() dto: AbrirDesembarqueSesionDto, @Request() req: any) { return this.service.abrirSesion(dto, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN, RolUsuario.OPERADOR, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('sesiones/:id/resumen') resumenSesion(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return this.service.resumenSesion(id, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('sesiones/:id/bultos') escanearBulto(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EscanearDesembarqueBultoDto, @Request() req: any) { return this.service.escanearBulto(id, dto, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('sesiones/:id/cerrar') cerrarSesion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CerrarDesembarqueSesionDto, @Request() req: any) { return this.service.cerrarSesion(id, dto.motivo, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/verificar') verificar(@Param('id', ParseUUIDPipe) id: string, @Query('legacy') legacy: string, @Request() req: any) { return this.service.verificar(id, req.user?.sub, req.user, legacy === 'true') }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN, RolUsuario.OPERADOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/entregar') entregar(@Param('id', ParseUUIDPipe) id: string, @Query('legacy') legacy: string, @Body() dto: DesembarqueEntregaDto, @Request() req: any) { return this.service.entregar(id, dto, req.user?.sub, req.user, legacy === 'true') }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/observar') observar(@Param('id', ParseUUIDPipe) id: string, @Query('legacy') legacy: string, @Body() dto: DesembarqueObservacionDto, @Request() req: any) { return this.service.observar(id, dto.observacion, req.user?.sub, req.user, legacy === 'true') }
}
