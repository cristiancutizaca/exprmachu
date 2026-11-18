export type DetraccionTransporte = { base: number; monto: number; tasa: number; aplica: boolean }

export function detraccionTransporte(input: { importe: number; valorReferencial?: number; gravado: boolean; sustentaCreditoOCosto: boolean; sectorPublico: boolean; domiciliado: boolean }): DetraccionTransporte {
  const base = Math.max(input.importe, input.valorReferencial || 0)
  const aplica = input.gravado && input.domiciliado && (input.sustentaCreditoOCosto || input.sectorPublico) && base > 400
  const monto = aplica ? Math.round(Math.round(base * 100) * 4 / 100) / 100 : 0
  return { base, monto, tasa: 4, aplica }
}
