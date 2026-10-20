import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'
import { EstadoTransbordo } from '../../database/entities/operaciones.entity'

export class TransbordoQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number
  @IsOptional() @IsUUID() sedeId?: string
  @IsOptional() @IsUUID() origenId?: string
  @IsOptional() @IsUUID() destinoId?: string
  @IsOptional() @IsUUID() desembarqueId?: string
  @IsOptional() @IsEnum(EstadoTransbordo) estado?: EstadoTransbordo
  @IsOptional() @IsDateString() fechaInicio?: string
  @IsOptional() @IsDateString() fechaFin?: string
}

export class CreateTransbordoDto {
  @IsUUID() sedeId: string
  @IsUUID() origenId: string
  @IsUUID() destinoId: string
  @IsOptional() @IsUUID() desembarqueId?: string
  @IsOptional() @IsUUID() manifiestoId?: string
  @IsOptional() @IsUUID() vehiculoAnteriorId?: string
  @IsOptional() @IsUUID() conductorAnteriorId?: string
  @IsOptional() @IsUUID() vehiculoNuevoId?: string
  @IsOptional() @IsUUID() conductorNuevoId?: string
  @IsString() @MaxLength(500) motivo: string
}

export class AddTicketTransbordoDto {
  @IsUUID() ticketId: string
}

export class ChangeTransbordoStateDto {
  @IsEnum(EstadoTransbordo) estado: EstadoTransbordo
}

export class UpdateTransbordoFleetDto {
  @IsOptional() @IsUUID() vehiculoNuevoId?: string
  @IsOptional() @IsUUID() conductorNuevoId?: string
  @IsOptional() @IsString() @MaxLength(500) motivo?: string
}
