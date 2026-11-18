import { Transform } from 'class-transformer'
import { IsBoolean, IsIn, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator'

export const CPE_TYPES = ['01', '03'] as const
export type CpeType = typeof CPE_TYPES[number]

export class CpeSeriesDto {
  @IsUUID() sedeId: string
  @IsIn(CPE_TYPES) tipo: CpeType
  @Matches(/^[FB][A-Z0-9]{3}$/) serie: string
  @IsInt() @Min(0) @Max(99999998) ultimoCorrelativo: number
  @Matches(/^\d{4}$/) codigoEstablecimiento: string
}

export class EmitCpeFiscalDto {
  @IsUUID() ticketId: string
  @IsUUID() solicitudId: string
  @IsIn(CPE_TYPES) tipo: CpeType
  @Matches(/^[FB][A-Z0-9]{3}$/) serie: string
  @Transform(({ obj, key }) => obj[key]) @IsBoolean() sectorPublico: boolean
  @IsIn(['NO_CORRESPONDE', 'DECLARADO']) valorReferencialTipo: 'NO_CORRESPONDE' | 'DECLARADO'
  @IsOptional() @Matches(/^\d{1,10}(\.\d{1,2})?$/) valorReferencial?: string
  @IsIn(['Contado', 'Credito']) formaPago: 'Contado' | 'Credito'
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) vencimiento?: string
}
