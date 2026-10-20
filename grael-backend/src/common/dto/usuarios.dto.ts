import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, Length, MaxLength, MinLength } from 'class-validator'
import { RolUsuario } from '../../database/entities/usuario.entity'

export class CreateUsuarioDto {
  @IsString() @Length(3, 60) username: string
  @IsString() @MinLength(8) @MaxLength(120) password: string
  @IsString() @MaxLength(80) nombre: string
  @IsString() @MaxLength(100) apellido: string
  @IsOptional() @IsEmail() @MaxLength(80) email?: string
  @IsOptional() @IsString() @MaxLength(80) telefono?: string
  @IsEnum(RolUsuario) rol: RolUsuario
  @IsOptional() @IsString() @MaxLength(60) sede?: string
  @IsOptional() @IsUUID() sedeId?: string
}

export class UpdateUsuarioDto {
  @IsOptional() @IsString() @Length(3, 60) username?: string
  @IsOptional() @IsString() @MinLength(8) @MaxLength(120) password?: string
  @IsOptional() @IsString() @MaxLength(80) nombre?: string
  @IsOptional() @IsString() @MaxLength(100) apellido?: string
  @IsOptional() @IsEmail() @MaxLength(80) email?: string
  @IsOptional() @IsString() @MaxLength(80) telefono?: string
  @IsOptional() @IsEnum(RolUsuario) rol?: RolUsuario
  @IsOptional() @IsString() @MaxLength(60) sede?: string
  @IsOptional() @IsUUID() sedeId?: string
  @IsOptional() activo?: boolean
}
