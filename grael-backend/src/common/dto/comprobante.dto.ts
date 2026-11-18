import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'
import { TipoComprobante } from '../../database/entities/operaciones.entity'

export enum EstadoComprobante {
  INTERNO = 'INTERNO',
  SIMULADO = 'SIMULADO',
  EMITIDO = 'EMITIDO',
  PENDIENTE = 'PENDIENTE_SUNAT',
  ENVIADO = 'ENVIADO_SUNAT',
  ACEPTADO = 'ACEPTADO',
  ACEPTADO_CON_OBSERVACIONES = 'ACEPTADO_CON_OBSERVACIONES',
  ACEPTADO_TEST = 'ACEPTADO_TEST',
  RECHAZADO = 'RECHAZADO',
  ANULADO = 'ANULADO',
  ANULADO_MOCK = 'ANULADO_MOCK',
}

const day = /^\d{4}-\d{2}-\d{2}$/

export class ComprobanteQueryDto {
  @IsOptional() @IsEnum(TipoComprobante) tipo?: TipoComprobante
  @IsOptional() @IsEnum(EstadoComprobante) estado?: EstadoComprobante
  @IsOptional() @IsString() @MaxLength(60) q?: string
  @IsOptional() @IsUUID() sedeId?: string
  @IsOptional() @Matches(day) fechaDesde?: string
  @IsOptional() @Matches(day) fechaHasta?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50000) page = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20
}

export class AnularComprobanteDto {
  @IsString() @MinLength(3) @MaxLength(240)
  motivo: string
}
