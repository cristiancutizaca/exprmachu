import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'
import { TipoMovimientoCaja } from '../../database/entities/caja.entity'
import { EstadoEntrega, TipoEntregaV2 } from '../../database/entities/entrega.entity'
import { DisposicionIncidencia, EstadoIncidencia, TipoIncidencia } from '../../database/entities/incidencia.entity'
import { EstadoBulto } from '../../database/entities/bulto.entity'
import { TipoTrackingEvento } from '../../database/entities/tracking-evento.entity'

export class CreateBultoV4Dto {
  @IsUUID() ticketId: string
  @IsOptional() @IsString() @MaxLength(80) tipo?: string
  @IsOptional() @IsString() @MaxLength(250) descripcion?: string
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) cantidad?: number
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() pesoReal?: number
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() pesoVolumetrico?: number
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() alto?: number
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() ancho?: number
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() largo?: number
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() volumen?: number
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorDeclarado?: number
  @IsOptional() fragil?: boolean
  @IsOptional() requiereCuidado?: boolean
  @IsOptional() @IsString() @MaxLength(100) codigoBarras?: string
  @IsOptional() @IsString() @MaxLength(500) observaciones?: string
}

export class ChangeBultoStateV4Dto {
  @IsEnum(EstadoBulto) estado: EstadoBulto
  @IsOptional() @IsString() @MaxLength(500) observacion?: string
}

export class CajaDiariaQueryDto {
  @IsOptional() @IsDateString() fecha?: string
  @IsOptional() @IsUUID() sedeId?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number
}

export class OpenCashV4Dto {
  @IsUUID() sedeId: string
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) saldoInicial?: number
  @IsOptional() @IsString() @MaxLength(500) observacion?: string
}

export class OpenCashV9Dto extends OpenCashV4Dto {}


export class CashMovementV4Dto {
  @IsEnum(TipoMovimientoCaja) tipoMovimiento: TipoMovimientoCaja
  @Type(() => Number) @IsNumber() @IsPositive() monto: number
  @IsOptional() @IsString() @MaxLength(30) metodoPago?: string
  @IsString() @MaxLength(180) concepto: string
  @IsOptional() @IsUUID() pagoId?: string
  @IsOptional() metadata?: Record<string, unknown>
}

export class CloseCashV4Dto {
  @Type(() => Number) @IsNumber() @Min(0) saldoDeclarado: number
  @IsOptional() @IsString() @MaxLength(500) observacion?: string
}

export class CloseCashV9Dto extends CloseCashV4Dto {}

export class EntregaQueryV9Dto {
  @IsOptional() @IsUUID() ticketId?: string
  @IsOptional() @IsUUID() bultoId?: string
  @IsOptional() @IsUUID() sedeId?: string
  @IsOptional() @IsEnum(EstadoEntrega) estado?: EstadoEntrega
}

export class CreateEntregaV9Dto {
  @IsUUID() ticketId: string
  @IsOptional() @IsUUID() bultoId?: string
  @IsEnum(TipoEntregaV2) tipo: TipoEntregaV2
  @IsOptional() @IsDateString() fechaProgramada?: string
  @IsOptional() @IsString() @MaxLength(500) observacion?: string
}

export class ConfirmEntregaV9Dto {
  @IsString() @MaxLength(120) nombreReceptor: string
  @IsString() @MaxLength(30) documentoReceptor: string
  @IsOptional() @IsString() @MaxLength(500) observacion?: string
  @IsOptional() evidencia?: Record<string, unknown>
  @IsOptional() @Type(() => Number) @IsNumber() latitud?: number
  @IsOptional() @Type(() => Number) @IsNumber() longitud?: number
  @IsOptional() @IsString() firma?: string
}

export class DeliveryAttemptV9Dto {
  @IsOptional() @IsString() @MaxLength(500) observacion?: string
  @IsOptional() @IsIn(['CLIENTE_AUSENTE', 'DIRECCION_INCORRECTA', 'RECHAZADO', 'NO_UBICADO', 'OTRO']) motivo?: string
}

export class EmitGreDto {
  @IsUUID() ticketId: string
  @IsOptional() @IsUUID() manifiestoId?: string
  @IsIn(['GRE']) tipo: 'GRE'
  @IsOptional() @IsString() @MaxLength(500) observacion?: string
}

export class EmitCpeDto {
  @IsUUID() ticketId: string
  @IsOptional() @IsUUID() manifiestoId?: string
  @IsIn(['CPE']) tipo: 'CPE'
  @IsOptional() @IsString() @MaxLength(20) serie?: string
  @IsOptional() @IsString() @MaxLength(500) observacion?: string
}

export class GreQueryDto {
  @IsOptional() @IsUUID() sedeId?: string
  @IsOptional() @IsIn(['GRE', 'CPE']) tipo?: 'GRE' | 'CPE'
  @IsOptional() @IsString() @MaxLength(80) estado?: string
}

export class IncidenciaQueryV9Dto {
  @IsOptional() @IsUUID() ticketId?: string
  @IsOptional() @IsUUID() bultoId?: string
  @IsOptional() @IsUUID() sedeId?: string
  @IsOptional() @IsEnum(EstadoIncidencia) estado?: EstadoIncidencia
  @IsOptional() @IsEnum(TipoIncidencia) tipo?: TipoIncidencia
}

export class CreateIncidenciaV9Dto {
  @IsUUID() ticketId: string
  @IsOptional() @IsUUID() bultoId?: string
  @IsEnum(TipoIncidencia) tipo: TipoIncidencia
  @IsString() @MaxLength(240) descripcion: string
  @IsOptional() evidencia?: Record<string, unknown>
}

export class ResolveIncidenciaV9Dto {
  @IsEnum(EstadoIncidencia) estado: EstadoIncidencia
  @IsEnum(DisposicionIncidencia) disposicion: DisposicionIncidencia
  @IsOptional() @IsString() @MaxLength(500) resolucion?: string
}

export class ManualTrackingV4Dto {
  @IsUUID() ticketId: string
  @IsOptional() @IsUUID() bultoId?: string
  @IsEnum(TipoTrackingEvento) tipoEvento: TipoTrackingEvento
  @IsOptional() @IsUUID() sedeId?: string
  @IsOptional() @IsUUID() almacenId?: string
  @IsOptional() @IsUUID() ubicacionId?: string
  @IsOptional() @IsUUID() manifiestoId?: string
  @IsOptional() @IsString() @MaxLength(500) observacion?: string
  @IsOptional() metadata?: Record<string, unknown>
}
