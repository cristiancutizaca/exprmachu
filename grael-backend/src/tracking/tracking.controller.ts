import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { TrackingService } from './tracking.service'
import { ManualTrackingV4Dto } from '../common/dto/secured-operations.dto'

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly service: TrackingService) {}

  @Get('public/:codigo')
  publico(@Param('codigo') codigo: string) { return this.service.resumenPublico(codigo) }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('ticket/:ticketId')
  porTicket(@Param('ticketId') ticketId: string, @Request() req: any) { return this.service.porTicket(ticketId, req.user) }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('bulto/:bultoId')
  porBulto(@Param('bultoId') bultoId: string, @Request() req: any) { return this.service.porBulto(bultoId, req.user) }

  @ApiBearerAuth()
  @Roles(RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  registrar(@Body() body: ManualTrackingV4Dto, @Request() req: any) { return this.service.registrar(body, req.user?.sub, req.user) }
}
