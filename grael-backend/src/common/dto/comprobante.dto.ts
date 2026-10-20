import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'
import { TipoComprobante } from '../../database/entities/operaciones.entity'

export enum EstadoComprobante {
  EMITIDO = 'EMITIDO',
  ANULADO = 'ANULADO',
}

export class ComprobanteQueryDto {
  @IsOptional() @IsEnum(TipoComprobante)
  tipo?: TipoComprobante

  @IsOptional() @IsEnum(EstadoComprobante)
  estado?: EstadoComprobante

  @IsOptional() @IsString() @MaxLength(60)
  q?: string

  @IsOptional() @IsString()
  sedeId?: string

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 20
}

export class AnularComprobanteDto {
  @IsString() @MinLength(3) @MaxLength(240)
  motivo: string
}

