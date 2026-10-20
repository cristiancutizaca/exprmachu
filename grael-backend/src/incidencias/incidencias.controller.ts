import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { IncidenciasService } from './incidencias.service'
import { CreateIncidenciaV9Dto, IncidenciaQueryV9Dto, ResolveIncidenciaV9Dto } from '../common/dto/secured-operations.dto'

@ApiTags('Incidencias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('incidencias')
export class IncidenciasController {
  constructor(private readonly service: IncidenciasService) {}
  @Get() listar(@Query() query: IncidenciaQueryV9Dto, @Request() req: any) { return this.service.listar(query, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.ALMACEN, RolUsuario.REPARTIDOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post() crear(@Body() body: CreateIncidenciaV9Dto, @Request() req: any) { return this.service.crear(body, req.user?.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/resolver') resolver(@Param('id', ParseUUIDPipe) id: string, @Body() body: ResolveIncidenciaV9Dto, @Request() req: any) { return this.service.resolver(id, body, req.user?.sub, req.user) }
}
