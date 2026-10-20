import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { ApproveEgresoDto, CancelEgresoDto, CreateEgresoDto, RejectEgresoDto } from '../common/dto/egresos.dto'
import { EgresosService } from './egresos.service'

@ApiTags('Egresos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('egresos')
export class EgresosController {
  constructor(private readonly service: EgresosService) {}

  @Get() listar(@Query() query: any, @Request() req: any) { return this.service.listar(query, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.CAJERO, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post() crear(@Body() body: CreateEgresoDto, @Request() req: any) { return this.service.crear(body, req.user.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/aprobar') aprobar(@Param('id') id: string, @Body() body: ApproveEgresoDto, @Request() req: any) { return this.service.aprobar(id, body || {}, req.user.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/rechazar') rechazar(@Param('id') id: string, @Body() body: RejectEgresoDto, @Request() req: any) { return this.service.rechazar(id, body.motivo, req.user.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/anular') anular(@Param('id') id: string, @Body() body: CancelEgresoDto, @Request() req: any) { return this.service.anular(id, body.motivo, req.user.sub, req.user) }
}
