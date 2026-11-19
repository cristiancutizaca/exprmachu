/** Fechas civiles de Perú (UTC-05:00, sin horario de verano). */
import { BadRequestException } from '@nestjs/common'

export function hoyPeru(now: Date = new Date()): string {
  return new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function limitesDiaPeru(fecha: string): { inicio: Date; fin: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new BadRequestException('Fecha inválida: use AAAA-MM-DD')
  const inicio = new Date(`${fecha}T05:00:00.000Z`)
  if (Number.isNaN(inicio.getTime()) || inicio.toISOString().slice(0, 10) !== fecha) {
    throw new BadRequestException('Fecha civil inválida')
  }
  const fin = new Date(inicio.getTime() + 86400000 - 1)
  return { inicio, fin }
}

/** Legacy timestamp columns contain the database session's civil time (DEFAULT now()). */
export function fechaLocalPeru(column: string): string {
  return `((${column} AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'America/Lima')`
}

export function limiteEnZonaDb(parameter: string): string {
  return `(CAST(${parameter} AS timestamptz) AT TIME ZONE current_setting('TimeZone'))`
}
