import { Controller, Post, Get, Patch, Body, UseGuards, Request, HttpCode } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { IsString, MinLength, IsUUID } from 'class-validator'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt.guard'
import { Roles } from './roles.decorator'
import { RolesGuard } from './roles.guard'
import { RolUsuario } from '../database/entities/usuario.entity'

class LoginDto {
  @IsString() username: string
  @IsString() @MinLength(1) password: string
}

class ChangePasswordDto {
  @IsString() @MinLength(1) passwordActual: string
  @IsString() @MinLength(8) passwordNueva: string
}

class ResetPasswordDto {
  @IsUUID() usuarioId: string
  @IsString() @MinLength(8) passwordNueva: string
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password)
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  changePassword(@Body() dto: ChangePasswordDto, @Request() req: any) {
    return this.authService.changePassword(req.user.sub, dto.passwordActual, dto.passwordNueva)
  }

  @Patch('password/reset')
  @Roles(RolUsuario.ADMIN_SEDE, RolUsuario.SUPERVISOR, RolUsuario.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  resetPassword(@Body() dto: ResetPasswordDto, @Request() req: any) {
    return this.authService.resetPassword(req.user, dto.usuarioId, dto.passwordNueva)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario actual' })
  me(@Request() req) {
    return this.authService.getMe(req.user.sub)
  }

  @Post('logout')
  @HttpCode(200)
  logout() {
    return { message: 'Sesión cerrada' }
  }
}
