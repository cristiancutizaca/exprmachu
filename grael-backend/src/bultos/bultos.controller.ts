import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'
import { BultosService } from './bultos.service'
import { CreateBultoV4Dto } from '../common/dto/secured-operations.dto'
import { CorrectBultoStateDto, LegacyBultoStateDto } from '../common/dto/state-correction.dto'

@ApiTags('Bultos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bultos')
export class BultosController {
  constructor(private readonly service: BultosService) {}

  @Get() listar(@Query() query: any, @Request() req: any) { return this.service.listar(query, req.user) }

  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.OPERADOR, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN, RolUsuario.ALMACEN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post() crear(@Body() body: CreateBultoV4Dto, @Request() req: any) { return this.service.crear(body, req.user?.sub, req.user) }

  /** @deprecated Use the operational workflow or POST /bultos/:id/correccion-estado. Requires legacy=true and a reason. */
  @Roles(RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/estado') cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: LegacyBultoStateDto,
    @Query('legacy') legacy: string | undefined,
    @Request() req: any,
  ) {
    return this.service.cambiarEstado(id, body.estado, req.user?.sub, body.motivo, req.user, legacy === 'true', body.motivo)
  }

  @Roles(RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/correccion-estado') corregirEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CorrectBultoStateDto,
    @Request() req: any,
  ) {
    return this.service.corregirEstado(id, body.estadoDestino, body.motivo, req.user)
  }

  @Get(':id/etiqueta')
  async etiqueta(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response, @Request() req: any) {
    const html = await this.service.etiqueta(id, req.user)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  }
}
