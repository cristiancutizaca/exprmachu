import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { TransbordoService } from './transbordo.service'
import { AddTicketTransbordoDto, ChangeTransbordoStateDto, CreateTransbordoDto, TransbordoQueryDto, UpdateTransbordoFleetDto } from '../common/dto/transbordo.dto'

@ApiTags('Transbordo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transbordo')
export class TransbordoController {
  constructor(private readonly service: TransbordoService) {}

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN, RolUsuario.OPERADOR, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get() listar(@Query() params: TransbordoQueryDto, @Request() req: any) { return this.service.listar(params, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id/manifiesto') async manifiesto(@Param('id', ParseUUIDPipe) id: string, @Request() req: any, @Res() res: Response) { const content = await this.service.manifiesto(id, req.user); res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="manifiesto-${id}.csv"`); return res.send(content) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN, RolUsuario.OPERADOR, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id') findById(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return this.service.findById(id, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post() crear(@Body() dto: CreateTransbordoDto, @Request() req: any) { return this.service.crear(dto, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/tickets') agregarTicket(@Param('id', ParseUUIDPipe) id: string, @Body() body: AddTicketTransbordoDto, @Request() req: any) { return this.service.agregarTicket(id, body.ticketId, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/tickets/:ticketId') quitarTicket(@Param('id', ParseUUIDPipe) id: string, @Param('ticketId', ParseUUIDPipe) ticketId: string, @Request() req: any) { return this.service.quitarTicket(id, ticketId, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/flota') actualizarFlota(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTransbordoFleetDto, @Request() req: any) { return this.service.actualizarFlota(id, dto, req.user) }

  @Roles(RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/estado') cambiarEstado(@Param('id', ParseUUIDPipe) id: string, @Body() body: ChangeTransbordoStateDto, @Request() req: any) { return this.service.cambiarEstado(id, body.estado, req.user) }
}
