import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ReportesService } from './reportes.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'

const REPORT_ROLES = [RolUsuario.AUDITOR, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO] as const

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Roles(...REPORT_ROLES)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('dashboard') dashboard(@Query('sedeId') sedeId: string, @Request() req: any) { return this.service.dashboardKpis(req.user, sedeId) }

  @Roles(...REPORT_ROLES)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('resumen-mes') resumen(@Query('anio') anio: number, @Query('mes') mes: number, @Query('sedeId') sedeId: string, @Request() req: any) { return this.service.resumenMes(Number(anio), Number(mes), req.user, sedeId) }

  @Roles(...REPORT_ROLES)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('comparativo') comparativo(@Query('sedeId') sedeId: string, @Request() req: any) { return this.service.comparativo6Meses(req.user, sedeId) }

  @Roles(...REPORT_ROLES)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('pendientes-cobro') pendientes(@Query('sedeId') sedeId: string, @Request() req: any) { return this.service.pendientesCobro(req.user, sedeId) }

  @Roles(...REPORT_ROLES)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('por-mercaderia') porMerc(@Query('anio') anio: number, @Query('mes') mes: number, @Query('sedeId') sedeId: string, @Request() req: any) { return this.service.porTipoMercaderia(Number(anio), Number(mes), req.user, sedeId) }
}
