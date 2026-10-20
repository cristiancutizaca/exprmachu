import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'
import { EstadoBulto } from '../../database/entities/bulto.entity'
import { TipoMovimientoAlmacen } from '../../database/entities/movimiento-almacen.entity'

export class InventarioQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number
  @IsOptional() @IsUUID() sedeId?: string
  @IsOptional() @IsUUID() almacenId?: string
  @IsOptional() @IsUUID() ubicacionId?: string
  @IsOptional() @IsUUID() ticketId?: string
  @IsOptional() @IsEnum(EstadoBulto) estado?: EstadoBulto
  @IsOptional() @IsString() @MaxLength(80) codigo?: string
}

export class MovimientoInventarioQueryDto {
  @IsOptional() @IsUUID() bultoId?: string
  @IsOptional() @IsUUID() sedeId?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number
}

export class MoverInventarioDto {
  @IsUUID() bultoId: string
  @IsUUID() almacenDestinoId: string
  @IsUUID() ubicacionDestinoId: string
  @IsEnum(TipoMovimientoAlmacen) tipo: TipoMovimientoAlmacen
  @IsString() @MaxLength(500) motivo: string
  @IsOptional() @IsString() @MaxLength(80) referenciaTipo?: string
  @IsOptional() @IsUUID() referenciaId?: string
}
