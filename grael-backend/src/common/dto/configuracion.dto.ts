import { IsArray, IsOptional, IsString, MaxLength, ArrayMaxSize, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class SetConfiguracionDto {
  @IsString()
  @MaxLength(2000)
  valor: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string
}

export class ConfiguracionUpdateItemDto {
  @IsString()
  @MaxLength(60)
  clave: string

  @IsString()
  @MaxLength(2000)
  valor: string
}

export class BulkConfiguracionDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ConfiguracionUpdateItemDto)
  updates: ConfiguracionUpdateItemDto[]
}
