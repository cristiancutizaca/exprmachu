import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { EntregasService } from './entregas.service'
import { ConfirmEntregaV9Dto, CreateEntregaV9Dto, DeliveryAttemptV9Dto, EntregaQueryV9Dto } from '../common/dto/secured-operations.dto'

@ApiTags('Entregas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entregas')
export class EntregasController {
  constructor(private readonly service: EntregasService) {}
  @Get() listar(@Query() query: EntregaQueryV9Dto, @Request() req: any) { return this.service.listar(query, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.REPARTIDOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post() crear(@Body() body: CreateEntregaV9Dto, @Request() req: any) { return this.service.crear(body, req.user?.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.REPARTIDOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/entregar') entregar(@Param('id', ParseUUIDPipe) id: string, @Body() body: ConfirmEntregaV9Dto, @Request() req: any) { return this.service.entregar(id, body, req.user?.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.REPARTIDOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/intento-fallido') intentoFallido(@Param('id', ParseUUIDPipe) id: string, @Body() body: DeliveryAttemptV9Dto, @Request() req: any) { return this.service.intentoFallido(id, body, req.user?.sub, req.user) }
}
