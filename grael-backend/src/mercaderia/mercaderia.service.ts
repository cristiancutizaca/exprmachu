import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { cotizarMercaderia } from './cotizacion'

@Injectable()
export class MercaderiaService {
  constructor(private readonly db: DataSource) {}

  async tiposLista(): Promise<string[]> {
    const rows = await this.db.query(`SELECT upper(tipo_mercaderia) AS tipo FROM tarifas WHERE activo
      UNION SELECT upper(replace(substr(clave, 8), '_', ' ')) FROM configuracion WHERE clave LIKE 'tarifa.%'
      ORDER BY tipo`)
    return rows.map((row: { tipo: string }) => row.tipo)
  }

  calcularCosto(tipo: string, peso: number, cantidad: number, origenId?: string, destinoId?: string, entrega?: string) {
    return cotizarMercaderia(this.db.manager, { tipo, peso: peso * cantidad, origenId, destinoId, reparto: entrega === 'REPARTO' })
  }
}
