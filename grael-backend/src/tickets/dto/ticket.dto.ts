import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength, ValidateNested } from 'class-validator'
import { EstadoTicket, TipoEntrega, TipoPago } from '../../database/entities/ticket.entity'
import { EstadoBulto } from '../../database/entities/bulto.entity'
import { MetodoPago } from '../../database/entities/operaciones.entity'

export class GuiaRemisionDto {
  @IsString() @MinLength(1) @MaxLength(60)
  codigo: string
}

export class MercaderiaDto {
  @IsString() @MinLength(1) @MaxLength(60)
  tipo: string

  @IsOptional() @IsString() @MaxLength(200)
  descripcion?: string

  @Type(() => Number) @IsNumber() @Min(0.001)
  pesoTotal: number

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  cantidad?: number

  @IsOptional() @IsBoolean()
  esPesoVolumen?: boolean

  @IsOptional() @IsBoolean()
  fragil?: boolean

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  numeroBultos?: number

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  costoKg?: number
}

export class BultoInputDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  numero?: number

  @IsOptional() @IsString() @MaxLength(40)
  codigo?: string

  @IsOptional() @IsString() @MaxLength(60)
  tipo?: string

  @IsOptional() @IsString() @MaxLength(200)
  descripcion?: string

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  cantidad?: number

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  pesoReal?: number

  @IsOptional() @IsBoolean()
  fragil?: boolean

  @IsOptional() @IsEnum(EstadoBulto)
  estado?: EstadoBulto
}

export class CreateTicketDto {
  @IsOptional() @IsString() @MaxLength(10)
  serie?: string

  @IsDateString()
  fechaViaje: string

  @IsEnum(TipoEntrega)
  tipoEntrega: TipoEntrega

  @IsEnum(TipoPago)
  tipoPago: TipoPago

  @IsUUID()
  origenId: string

  @IsUUID()
  destinoId: string

  /** Solo puede diferir de la sede del actor cuando la política global lo permite. */
  @IsOptional() @IsUUID()
  sedeRecepcionId?: string

  @IsUUID()
  remitenteId: string

  @IsUUID()
  destinatarioId: string

  @IsOptional() @IsUUID()
  programacionId?: string

  @IsOptional() @IsString() @MaxLength(100)
  atencion1?: string

  @IsOptional() @IsString() @MaxLength(100)
  atencion2?: string

  @IsArray() @ValidateNested({ each: true }) @Type(() => GuiaRemisionDto)
  guiasRemision: GuiaRemisionDto[]

  @IsArray() @ValidateNested({ each: true }) @Type(() => MercaderiaDto)
  mercaderias: MercaderiaDto[]

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  numeroBultos?: number

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BultoInputDto)
  bultos?: BultoInputDto[]

  @IsOptional() @IsBoolean()
  tarifaManual?: boolean

  @IsOptional() @IsString() @MaxLength(240)
  motivoTarifaManual?: string
}

export class UpdateTicketDto {
  @IsOptional() @IsDateString()
  fechaViaje?: string

  @IsOptional() @IsEnum(TipoEntrega)
  tipoEntrega?: TipoEntrega

  @IsOptional() @IsEnum(TipoPago)
  tipoPago?: TipoPago

  @IsOptional() @IsString() @MaxLength(100)
  atencion1?: string

  @IsOptional() @IsString() @MaxLength(100)
  atencion2?: string

  @IsOptional() @IsUUID()
  programacionId?: string
}

export class PayTicketDto {
  @IsOptional() @IsEnum(MetodoPago)
  metodoPago?: MetodoPago

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01)
  monto?: number
}

export class CancelTicketDto {
  @IsString() @MinLength(3) @MaxLength(240)
  motivo: string
}

export class ChangeTicketStateDto {
  @IsEnum(EstadoTicket)
  estado: EstadoTicket
}
