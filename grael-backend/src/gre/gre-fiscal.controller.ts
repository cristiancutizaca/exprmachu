import { Body, Controller, Get, Param, ParseEnumPipe, ParseUUIDPipe, Patch, Post, Query, Request, StreamableFile, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ScopeUser } from '../auth/sede-scope'
import { RolUsuario } from '../database/entities/usuario.entity'
import { CreateGreDraftDto, GreDraftDataDto, GreFiscalQueryDto, GreSeriesDto, RecoverGreTicketDto } from './gre-fiscal.dto'
import { GreFiscalService } from './gre-fiscal.service'

const manage = [RolUsuario.SUPERADMIN, RolUsuario.SUPERVISOR, RolUsuario.ADMIN_SEDE]
const read = [...manage, RolUsuario.AUDITOR, RolUsuario.OPERADOR, RolUsuario.ALMACEN, RolUsuario.CAJERO]
enum FileKind { XML = 'xml', ZIP = 'zip', CDR = 'cdr', PDF = 'pdf' }

@ApiTags('Guías de remisión electrónicas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gre/fiscales')
export class GreFiscalController {
  constructor(private readonly service: GreFiscalService) {}

  @Roles(...read)
  @Get()
  list(@Query() query: GreFiscalQueryDto, @Request() req: { user: ScopeUser }) {
    return this.service.list(query, req.user)
  }

  @Roles(RolUsuario.SUPERADMIN)
  @Post('series')
  series(@Body() body: GreSeriesDto, @Request() req: { user: ScopeUser }) {
    return this.service.registerSeries(body, req.user)
  }

  @Roles(...manage)
  @Post('borradores')
  draft(@Body() body: CreateGreDraftDto, @Request() req: { user: ScopeUser }) {
    return this.service.createDraft(body, req.user)
  }

  @Roles(...read)
  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: ScopeUser }) {
    return this.service.detail(id, req.user)
  }

  @Roles(...manage)
  @Patch(':id/borrador')
  edit(@Param('id', ParseUUIDPipe) id: string, @Body() body: GreDraftDataDto, @Request() req: { user: ScopeUser }) {
    return this.service.editDraft(id, body, req.user)
  }

  @Roles(...manage)
  @Post(':id/validar')
  validate(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: ScopeUser }) {
    return this.service.validate(id, req.user)
  }

  @Roles(...manage)
  @Post(':id/enviar')
  send(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: ScopeUser }) {
    return this.service.send(id, req.user)
  }

  @Roles(...manage)
  @Post(':id/consultar')
  refresh(@Param('id', ParseUUIDPipe) id: string, @Request() req: { user: ScopeUser }) {
    return this.service.refresh(id, req.user)
  }

  @Roles(RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @Post(':id/conciliar-ticket')
  recover(@Param('id', ParseUUIDPipe) id: string, @Body() body: RecoverGreTicketDto, @Request() req: { user: ScopeUser }) {
    return this.service.recoverTicket(id, body, req.user)
  }

  @Roles(...read)
  @Get(':id/archivos/:kind')
  async file(@Param('id', ParseUUIDPipe) id: string, @Param('kind', new ParseEnumPipe(FileKind)) kind: FileKind,
    @Request() req: { user: ScopeUser }, @Query('inline') inline?: string) {
    const file = await this.service.file(id, kind, req.user)
    const mode = kind === FileKind.PDF && inline === '1' ? 'inline' : 'attachment'
    return new StreamableFile(file.bytes, { type: file.mime, disposition: `${mode}; filename="${file.name}"` })
  }
}
