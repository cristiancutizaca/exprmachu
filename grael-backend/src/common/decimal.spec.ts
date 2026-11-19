import Decimal from 'decimal.js'
import { decimalNumber, money, numericTransformer, sumMoney } from './decimal'

describe('contrato decimal con PostgreSQL', () => {
  it('serializa NUMERIC de tickets, tarifas y valores nulos', () => {
    expect(numericTransformer.from('9999999999.99')).toBe(9999999999.99)
    expect(numericTransformer.from('1.2345')).toBe(1.2345)
    expect(numericTransformer.from(null)).toBeNull()
    expect(numericTransformer.from('0.00')).toBe(0)
  })
  it('suma valores mixtos con precisión de céntimos y redondeo comercial', () => {
    expect(sumMoney(['0.10', 0.2, '-0.01'])).toBe(0.29)
    expect(money(new Decimal('8.375').times('1.2'))).toBe(10.05)
    expect(money('10.075')).toBe(10.08)
    expect(money('-10.075')).toBe(-10.08)
  })
  it('rechaza resultados no representables y valores inválidos', () => {
    for (const value of ['', 'NaN', 'Infinity', '123.4567890123456789']) {
      expect(() => decimalNumber(value)).toThrow()
    }
    expect(() => money('9007199254740992.00')).toThrow()
  })
})
