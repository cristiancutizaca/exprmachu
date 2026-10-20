import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { GreService } from './gre.service'
import { EmitCpeDto, EmitGreDto } from '../common/dto/secured-operations.dto'

@ApiTags('GRE/CPE')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gre')
export class GreController {
  constructor(private readonly service: GreService) {}

  @Post('emitir')
  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  emitir(@Body() body: EmitGreDto | EmitCpeDto, @Request() req: any) {
    return this.service.emitir(body, req.user)
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO, RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.AUDITOR)
  obtener(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.obtener(id, req.user)
  }
}
