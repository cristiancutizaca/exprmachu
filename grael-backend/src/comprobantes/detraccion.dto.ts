import { Transform } from 'class-transformer'
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator'

export class DetraccionDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999.99) importe: number
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999.99) valorReferencial?: number
  @Transform(({ obj, key }) => obj[key]) @IsBoolean() gravado: boolean
  @Transform(({ obj, key }) => obj[key]) @IsBoolean() sustentaCreditoOCosto: boolean
  @Transform(({ obj, key }) => obj[key]) @IsBoolean() sectorPublico: boolean
  @Transform(({ obj, key }) => obj[key]) @IsBoolean() domiciliado: boolean
}
