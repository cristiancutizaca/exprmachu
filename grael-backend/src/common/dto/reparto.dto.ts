import { Type } from 'class-transformer'
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class RetornoRepartoDto {
  @IsUUID()
  almacenDestinoId: string

  @IsUUID()
  ubicacionDestinoId: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string
}

export class IntentoRepartoDto {
  @IsString()
  estado: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentoReceptor?: string

  @IsOptional()
  @IsString()
  @MaxLength(180)
  nombreReceptor?: string
}
