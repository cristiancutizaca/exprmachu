import { Type } from 'class-transformer'
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, ArrayMaxSize } from 'class-validator'
import { EstadoManifiesto } from '../../database/entities/operaciones.entity'

export class ManifiestoQueryDto {
  @IsOptional() @Type(() => Number) page?: number
  @IsOptional() @Type(() => Number) limit?: number
  @IsOptional() @IsUUID() sedeId?: string
  @IsOptional() @IsEnum(EstadoManifiesto) estado?: EstadoManifiesto
}

export class CreateManifiestoDto {
  @IsUUID() origenId: string
  @IsUUID() destinoId: string
  @IsUUID() sedeOrigenId: string
  @IsUUID() sedeDestinoId: string
  @IsOptional() @IsDateString() fechaViaje?: string
  @IsOptional() @IsUUID() programacionId?: string
  @IsOptional() @IsUUID() vehiculoId?: string
  @IsOptional() @IsUUID() conductorId?: string
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsUUID('4', { each: true }) ticketIds?: string[]
  @IsOptional() @IsString() @MaxLength(100) chofer?: string
  @IsOptional() @IsString() @MaxLength(30) placa?: string
  @IsOptional() @IsString() @MaxLength(1000) observaciones?: string
}

export class AddTicketsManifiestoDto {
  @IsArray() @ArrayMaxSize(500) @IsUUID('4', { each: true }) ticketIds: string[]
}

export class AssignManifiestoFleetDto {
  @IsUUID() vehiculoId: string
  @IsUUID() conductorId: string
}

export class LoadManifiestoBultoDto {
  @IsString() @MaxLength(80) codigo: string
}

export class ChangeManifiestoStateDto {
  @IsEnum(EstadoManifiesto) estado: EstadoManifiesto
  @IsOptional() @IsString() @MaxLength(500) motivo?: string
}
