import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { AuditoriaService } from './auditoria.service'

@ApiTags('Auditoria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}

  @Roles(RolUsuario.AUDITOR, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.ADMIN_SEDE)
  @Get()
  listar(@Query() query: any, @Request() req: any) { return this.service.listar(query, req.user) }
}
