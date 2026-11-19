import Decimal from 'decimal.js'
import type { ValueTransformer } from 'typeorm'

export type DecimalValue = number | string | Decimal

/** NUMERIC columns in this schema have at most 12 significant digits.
 * Aggregates can be larger. Refuse a lossy conversion at the JSON boundary. */
export function decimalNumber(value: DecimalValue): number {
  const decimal = new Decimal(value)
  const result = decimal.toNumber()
  if (!Number.isFinite(result) || !decimal.equals(String(result))) {
    throw new RangeError('Valor decimal fuera del rango representable')
  }
  return result
}

export const numericTransformer: ValueTransformer = {
  to: (value: number | string | null | undefined) => value,
  from: (value: string | number | null) => value == null ? value : decimalNumber(value),
}

export function money(value: DecimalValue): number {
  const rounded = new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  if (!Number.isSafeInteger(rounded.times(100).toNumber())) throw new RangeError('Importe fuera de rango')
  return decimalNumber(rounded)
}

export function sumMoney(values: Iterable<DecimalValue>): number {
  let total = new Decimal(0)
  for (const value of values) total = total.plus(value)
  return money(total)
}
