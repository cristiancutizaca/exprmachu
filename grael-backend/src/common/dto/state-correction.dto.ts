import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator'
import { EstadoBulto } from '../../database/entities/bulto.entity'
import { EstadoTicket } from '../../database/entities/ticket.entity'

export class CorrectTicketStateDto {
  @IsEnum(EstadoTicket) estadoDestino: EstadoTicket
  @IsString() @MinLength(5) @MaxLength(500) motivo: string
}

export class CorrectBultoStateDto {
  @IsEnum(EstadoBulto) estadoDestino: EstadoBulto
  @IsString() @MinLength(5) @MaxLength(500) motivo: string
}

export class LegacyTicketStateDto {
  @IsEnum(EstadoTicket) estado: EstadoTicket
  @IsString() @MinLength(5) @MaxLength(500) motivo: string
}

export class LegacyBultoStateDto {
  @IsEnum(EstadoBulto) estado: EstadoBulto
  @IsString() @MinLength(5) @MaxLength(500) motivo: string
}
