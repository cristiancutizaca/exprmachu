import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, Length } from 'class-validator'
import { EstadoDesembarqueBulto } from '../../database/entities/desembarque-fisico.entity'

export class DesembarqueEntregaDto {
  @IsString() @Length(6, 60) dniRecibe: string
  @IsString() @MaxLength(160) nombreRecibe: string
  @IsOptional() @IsString() @MaxLength(200) observacion?: string
}

export class AbrirDesembarqueSesionDto {
  @IsUUID() manifiestoId: string
  @IsUUID() almacenDestinoId: string
  @IsUUID() ubicacionDestinoId: string
  @IsOptional() @IsString() @MaxLength(500) observacion?: string
}

export class EscanearDesembarqueBultoDto {
  @IsString() @MaxLength(80) codigo: string
  @IsOptional() @IsEnum(EstadoDesembarqueBulto) estado?: EstadoDesembarqueBulto
  @IsOptional() @IsString() @MaxLength(500) observacion?: string
}

export class CerrarDesembarqueSesionDto {
  @IsOptional() @IsString() @MaxLength(500) motivo?: string
}

export class DesembarqueObservacionDto {
  @IsString() @MaxLength(200) observacion: string
}
