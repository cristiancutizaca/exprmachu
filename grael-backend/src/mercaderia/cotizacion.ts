import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import Decimal from 'decimal.js'
import { Configuracion } from '../database/entities/configuracion.entity'
import { Tarifa } from '../database/entities/tarifa.entity'
import { decimalNumber, money, sumMoney } from '../common/decimal'
import { hoyPeru } from '../common/peru-time'

interface SolicitudCotizacion {
  tipo: string
  peso: number
  origenId?: string
  destinoId?: string
  reparto?: boolean
  fragil?: boolean
  precioManual?: number
}

export async function cotizarMercaderia(manager: EntityManager, input: SolicitudCotizacion) {
  const { tipo, peso, origenId, destinoId } = input
  if (!tipo?.trim() || !Number.isFinite(Number(peso)) || Number(peso) <= 0) {
    throw new BadRequestException('Indique el tipo de mercadería y un peso total positivo')
  }
  const clave = tipo.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  const [tarifa, general, impuesto] = await Promise.all([
    origenId && destinoId ? manager.createQueryBuilder(Tarifa, 'tarifa')
      .where('tarifa.origen_id = :origenId AND tarifa.destino_id = :destinoId', { origenId, destinoId })
      .andWhere('LOWER(tarifa.tipo_mercaderia) = LOWER(:tipo) AND tarifa.activo', { tipo })
      .andWhere('tarifa.vigencia_desde <= :hoy AND (tarifa.vigencia_hasta IS NULL OR tarifa.vigencia_hasta >= :hoy)', { hoy: hoyPeru() })
      .orderBy('tarifa.vigencia_desde', 'DESC').addOrderBy('tarifa.id', 'ASC').getOne() : null,
    manager.findOneBy(Configuracion, { clave: `tarifa.${clave}` }),
    manager.findOneBy(Configuracion, { clave: 'sistema.igv' }),
  ])
  const precio = Number(input.precioManual ?? tarifa?.precioKg ?? general?.valor ?? 0)
  const tasa = Number(impuesto?.valor ?? 18)
  if (!Number.isFinite(precio) || precio < 0 || (precio === 0 && !(tarifa?.precioMinimo > 0))) {
    throw new BadRequestException({ code: 'TARIFF_NOT_CONFIGURED', message: `No existe tarifa válida para ${tipo} en la ruta seleccionada` })
  }
  if (!Number.isFinite(tasa) || tasa < 0 || tasa > 100) throw new BadRequestException('El porcentaje de IGV configurado es inválido')
  const base = Decimal.max(tarifa?.precioMinimo ?? 0, new Decimal(peso).times(precio))
  const subTotal = money(base.plus(input.reparto ? tarifa?.recargoReparto ?? 0 : 0).plus(input.fragil ? tarifa?.recargoFragil ?? 0 : 0))
  const igv = money(new Decimal(subTotal).times(tasa).div(100))
  return { costoKg: decimalNumber(precio), subTotal, igv, total: sumMoney([subTotal, igv]) }
}
