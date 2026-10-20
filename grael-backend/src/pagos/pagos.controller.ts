import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ParseUUIDPipe } from '@nestjs/common'
import { PagosService } from './pagos.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { CajaDiariaQueryDto, CashMovementV4Dto, CloseCashV9Dto, OpenCashV9Dto } from '../common/dto/secured-operations.dto'

@ApiTags('Pagos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pagos')
export class PagosController {
  constructor(private readonly service: PagosService) {}

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('caja-diaria') cajaDiaria(@Query() query: CajaDiariaQueryDto, @Request() req: any) { return this.service.getDelDia(query, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('caja/actual') cajaActual(@Request() req: any) { return this.service.sesionActual(req.user.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('caja/abrir') abrirCaja(@Body() body: OpenCashV9Dto, @Request() req: any) { return this.service.abrirCaja(body, req.user.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('caja/:id/movimientos') registrarMovimiento(@Param('id', ParseUUIDPipe) id: string, @Body() body: CashMovementV4Dto, @Request() req: any) { return this.service.registrarMovimiento(id, body, req.user.sub, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('caja/:id/cerrar') cerrarCaja(@Param('id', ParseUUIDPipe) id: string, @Body() body: CloseCashV9Dto, @Request() req: any) { return this.service.cerrarCaja(id, body, req.user.sub, req.user) }
}
