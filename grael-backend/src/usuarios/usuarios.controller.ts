import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UsuariosService } from './usuarios.service'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { CreateUsuarioDto, UpdateUsuarioDto } from '../common/dto/usuarios.dto'

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Roles(RolUsuario.AUDITOR, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get() listar(@Request() req: any) { return this.service.listar(req.user) }

  @Roles(RolUsuario.AUDITOR, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id') findById(@Param('id') id: string, @Request() req: any) { return this.service.findById(id, req.user) }

  @Roles(RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post() crear(@Body() dto: CreateUsuarioDto, @Request() req: any) { return this.service.crear(dto, req.user) }

  @Roles(RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto, @Request() req: any) { return this.service.update(id, dto, req.user) }

  @Roles(RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.ADMIN_SEDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/toggle') toggle(@Param('id') id: string, @Request() req: any) { return this.service.toggle(id, req.user) }
}
