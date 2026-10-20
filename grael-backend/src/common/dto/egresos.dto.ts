import { Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsPositive, MaxLength } from 'class-validator'
import { CategoriaEgreso } from '../../database/entities/egreso.entity'

export class CreateEgresoDto {
  @IsOptional()
  @IsUUID()
  sedeId?: string

  @IsEnum(CategoriaEgreso)
  categoria: CategoriaEgreso

  @IsString()
  @MaxLength(220)
  concepto: string

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  monto: number

  @IsOptional() @IsString() @MaxLength(180) proveedor?: string
  @IsOptional() @IsString() @MaxLength(11) ruc?: string
  @IsOptional() @IsString() @MaxLength(80) documento?: string
  @IsOptional() @IsString() @MaxLength(20) placa?: string
  @IsOptional() @IsString() @MaxLength(160) chofer?: string
  @IsOptional() @IsString() @MaxLength(160) destino?: string
  @IsOptional() @IsString() @MaxLength(2000) observacion?: string
  @IsOptional() @IsBoolean() afectaCaja?: boolean
}

export class ApproveEgresoDto {
  @IsOptional()
  @IsUUID()
  cajaSesionId?: string
}

export class RejectEgresoDto {
  @IsString()
  @MaxLength(500)
  motivo: string
}

export class CancelEgresoDto {
  @IsString()
  @MaxLength(500)
  motivo: string
}
