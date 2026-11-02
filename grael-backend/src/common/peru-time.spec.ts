import { BadRequestException } from '@nestjs/common'
import { hoyPeru, limitesDiaPeru } from './peru-time'

describe('Calendario de Perú (GRAEL)', () => {
  it('mantiene 1 de noviembre a las 22:18 en Perú aunque ya sea 2 UTC', () => {
    expect(hoyPeru(new Date('2026-11-02T03:18:00.000Z'))).toBe('2026-11-01')
  })
  it('calcula el día civil como intervalo 05:00 UTC a 04:59:59.999 UTC', () => {
    const { inicio, fin } = limitesDiaPeru('2026-11-01')
    expect(inicio.toISOString()).toBe('2026-11-01T05:00:00.000Z')
    expect(fin.toISOString()).toBe('2026-11-02T04:59:59.999Z')
  })
  it('no acepta fechas inexistentes ni formatos ambiguos', () => {
    expect(() => limitesDiaPeru('2026-02-30')).toThrow(BadRequestException)
    expect(() => limitesDiaPeru('01/11/2026')).toThrow(BadRequestException)
  })
})
