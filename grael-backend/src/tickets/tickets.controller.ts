import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { TicketsService } from './tickets.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { CancelTicketDto, CreateTicketDto, PayTicketDto, UpdateTicketDto } from './dto/ticket.dto'
import { CorrectTicketStateDto, LegacyTicketStateDto } from '../common/dto/state-correction.dto'

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Get() findAll(@Query() q: any, @Request() req: any) { return this.service.findAll(q, req.user) }

  @Get('estadisticas') stats(@Request() req: any) { return this.service.getEstadisticas(req.user) }

  @Get('exportar-os') exportarOS(@Query() q: any, @Res() res: Response, @Request() req: any) {
    return this.service.exportarOS(q, req.user).then(content => {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="grael-os.csv"')
      res.send(content)
    })
  }

  @Get(':id/imprimir') imprimir(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response, @Request() req: any) {
    return this.service.imprimir(id, req.user).then(content => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.send(content)
    })
  }

  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return this.service.findOne(id, req.user) }
  @Get(':id/qr') getQR(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return this.service.getQR(id, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post() crear(@Body() dto: CreateTicketDto, @Request() req: any) { return this.service.crear(dto, req.user.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTicketDto, @Request() req: any) { return this.service.update(id, dto, req.user) }

  @Roles(RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/anular') anular(@Param('id', ParseUUIDPipe) id: string, @Body() body: CancelTicketDto, @Request() req: any) { return this.service.anular(id, body.motivo, req.user.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/pagar') pagar(@Param('id', ParseUUIDPipe) id: string, @Body() body: PayTicketDto, @Request() req: any) { return this.service.pagar(id, body?.metodoPago, req.user.sub, body?.monto, req.user) }

  /** @deprecated Requires global role, legacy=true and a reason; does not create physical workflow events. */
  @Roles(RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/estado') cambiarEstado(@Param('id', ParseUUIDPipe) id: string, @Body() body: LegacyTicketStateDto, @Query('legacy') legacy: string | undefined, @Request() req: any) {
    return this.service.cambiarEstado(id, body.estado, req.user, legacy === 'true', body.motivo)
  }

  @Roles(RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/correccion-estado') corregirEstado(@Param('id', ParseUUIDPipe) id: string, @Body() body: CorrectTicketStateDto, @Request() req: any) {
    return this.service.corregirEstado(id, body.estadoDestino, body.motivo, req.user)
  }
}
