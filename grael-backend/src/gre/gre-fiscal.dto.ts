import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDefined, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator'

const TEXT = /^[^\u0000-\u001f]+$/
const DAY = /^\d{4}-\d{2}-\d{2}$/
export const GRE_TYPES = ['09', '31'] as const
export type GreType = typeof GRE_TYPES[number]

export class GreAddressDto {
  @Matches(/^\d{6}$/) ubigeo: string
  @Matches(TEXT) @MaxLength(500) direccion: string
  @IsOptional() @Matches(/^\d{4}$/) codigoLocal?: string
  @IsOptional() @Matches(/^\d{11}$/) rucLocal?: string
}

export class GrePartyDto {
  @IsIn(['1', '6']) tipoDocumento: '1' | '6'
  @Matches(/^\d{8}(\d{3})?$/) documento: string
  @Matches(TEXT) @MaxLength(250) razonSocial: string
  @IsOptional() @Matches(/^[A-Z0-9]{1,20}$/) registroMtc?: string
}

export class GreReferenceDto {
  @IsIn(['01', '03', '04', '09', '12', '31', '48']) tipo: string
  @Matches(/^[A-Z0-9-]{1,20}-[A-Z0-9-]{1,20}$/) numero: string
  @Matches(/^\d{11}$/) rucEmisor: string
}

export class GreItemDto {
  @Matches(TEXT) @MaxLength(500) descripcion: string
  @Matches(/^\d{1,12}(\.\d{1,10})?$/) cantidad: string
  @Matches(/^[A-Z0-9]{2,3}$/) unidad: string
}

export class GreVehicleDto {
  @Matches(/^[A-Z0-9]{6,8}$/) placa: string
  @IsOptional() @Matches(/^[A-Z0-9]{10,15}$/) tuc?: string
}

export class GreDriverDto {
  @Matches(/^\d{8}$/) dni: string
  @Matches(TEXT) @MaxLength(120) nombres: string
  @Matches(TEXT) @MaxLength(120) apellidos: string
  @Matches(/^[A-Z0-9]{1,10}$/) licencia: string
}

export class GreDraftDataDto {
  @Matches(/^[TV][A-Z0-9]{3}$/) serie: string
  @Matches(DAY) fechaTraslado: string
  @Matches(/^\d{1,12}(\.\d{1,3})?$/) pesoBruto: string
  @IsIn(['KGM', 'TNE']) unidadPeso: 'KGM' | 'TNE'
  @IsDefined() @ValidateNested() @Type(() => GreAddressDto) partida: GreAddressDto
  @IsDefined() @ValidateNested() @Type(() => GreAddressDto) llegada: GreAddressDto
  @IsOptional() @Matches(TEXT) @MaxLength(250) observacion?: string
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => GreReferenceDto) referencias?: GreReferenceDto[]
  @IsOptional() @IsArray() @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => GreItemDto) bienes?: GreItemDto[]
  @IsOptional() @ValidateNested() @Type(() => GreVehicleDto) vehiculo?: GreVehicleDto
  @IsOptional() @IsArray() @ArrayMaxSize(2) @ValidateNested({ each: true }) @Type(() => GreVehicleDto) remolques?: GreVehicleDto[]
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => GreDriverDto) conductores?: GreDriverDto[]

  @IsOptional() @IsIn(['01', '02']) modalidad?: '01' | '02'
  @IsOptional() @Matches(/^\d{2}$/) motivo?: string
  @IsOptional() @IsInt() @Min(1) @Max(99999999) bultos?: number
  @IsOptional() @ValidateNested() @Type(() => GrePartyDto) transportista?: GrePartyDto

  @IsOptional() @ValidateNested() @Type(() => GrePartyDto) subcontratador?: GrePartyDto
  @IsOptional() @IsIn(['Remitente', 'Subcontratador', 'Tercero']) pagador?: 'Remitente' | 'Subcontratador' | 'Tercero'
  @IsOptional() @ValidateNested() @Type(() => GrePartyDto) terceroPagador?: GrePartyDto
}

export class CreateGreDraftDto extends GreDraftDataDto {
  @IsUUID() ticketId: string
  @IsOptional() @IsUUID() manifiestoId?: string
  @IsIn(GRE_TYPES) tipoGuia: GreType
  @IsUUID() solicitudId: string
}

export class GreFiscalQueryDto {
  @IsOptional() @IsUUID() ticketId?: string
  @IsOptional() @IsUUID() manifiestoId?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50000) page = 1
}

export class RecoverGreTicketDto {
  @IsUUID() ticket: string
  @IsString() @MinLength(8) @MaxLength(250) motivo: string
}

export class GreSeriesDto {
  @IsUUID() sedeId: string
  @IsIn(GRE_TYPES) tipoGuia: GreType
  @Matches(/^[TV][A-Z0-9]{3}$/) serie: string
  @IsInt() @Min(0) @Max(99999998) ultimoCorrelativo: number
}
