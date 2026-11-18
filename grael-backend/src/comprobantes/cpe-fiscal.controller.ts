import { Body, Controller, Get, Param, ParseEnumPipe, ParseUUIDPipe, Post, Request, StreamableFile, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ScopeUser } from '../auth/sede-scope'
import { RolUsuario } from '../database/entities/usuario.entity'
import { CpeFiscalService } from './cpe-fiscal.service'
import { CpeSeriesDto, EmitCpeFiscalDto } from './cpe.dto'

const roles = [RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE, RolUsuario.CAJERO]
enum Kind { XML = 'xml', CDR = 'cdr' }

@ApiTags('Comprobantes SUNAT')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('comprobantes/fiscales')
export class CpeFiscalController {
  constructor(private readonly service: CpeFiscalService) {}

  @Roles(RolUsuario.SUPERADMIN)
  @Post('series')
  registerSeries(@Body() dto: CpeSeriesDto, @Request() req: { user: ScopeUser }) {
    return this.service.registerSeries(dto, req.user)
  }

  @Roles(...roles)
  @Post('emitir')
  issue(@Body() dto: EmitCpeFiscalDto, @Request() req: { user: ScopeUser }) {
    return this.service.issue(dto, req.user)
  }

  @Roles(...roles)
  @Post(':id/consultar')
  refresh(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: ScopeUser }) {
    return this.service.refresh(id, req.user)
  }

  @Roles(...roles, RolUsuario.AUDITOR, RolUsuario.OPERADOR)
  @Get(':id/archivos/:kind')
  async file(@Param('id', ParseUUIDPipe) id: string, @Param('kind', new ParseEnumPipe(Kind)) kind: Kind, @Request() req: { user: ScopeUser }) {
    const { bytes, name, type } = await this.service.file(id, kind, req.user)
    return new StreamableFile(bytes, { type, disposition: `attachment; filename="${name}"` })
  }
}
