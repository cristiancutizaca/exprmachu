import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { InventarioService } from './inventario.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { InventarioQueryDto, MovimientoInventarioQueryDto, MoverInventarioDto } from '../common/dto/inventario.dto'

@ApiTags('Inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventario')
export class InventarioController {
  constructor(private readonly service: InventarioService) {}

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.ALMACEN, RolUsuario.REPARTIDOR, RolUsuario.CAJERO, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('bultos') listar(@Query() query: InventarioQueryDto, @Request() req: any) { return this.service.listar(query, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.ALMACEN, RolUsuario.AUDITOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('movimientos') movimientos(@Query() query: MovimientoInventarioQueryDto, @Request() req: any) { return this.service.movimientos(query, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('movimientos') mover(@Body() body: MoverInventarioDto, @Request() req: any) { return this.service.mover(body, req.user?.sub, req.user) }
}
