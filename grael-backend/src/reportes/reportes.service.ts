import { decimalNumber, money, sumMoney } from '../common/decimal'
import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { assertSedeAccess, effectiveSedeId } from '../auth/sede-scope'
import { fechaLocalPeru, hoyPeru, limiteEnZonaDb, limitesDiaPeru } from '../common/peru-time'

@Injectable()
export class ReportesService {
  constructor(private readonly ds: DataSource) {}

  private scopedParams(user?: any, requestedSedeId?: string) {
    if (requestedSedeId) assertSedeAccess(user, requestedSedeId, 'consultar reportes')
    const sedeId = effectiveSedeId(user, requestedSedeId)
    return {
      sedeId,
      receptionTicket: (placeholder: number) => sedeId ? ` AND t.sede_recepcion_id = $${placeholder}` : '',
      payment: (placeholder: number) => sedeId ? ` AND p.sede_id = $${placeholder}` : '',
      custodyBulto: (placeholder: number) => sedeId ? ` AND b.sede_actual_id = $${placeholder}` : '',
      incident: (placeholder: number) => sedeId ? ` AND i.sede_id = $${placeholder}` : '',
    }
  }

  async resumenMes(anio?: number, mes?: number, user?: any, sedeId?: string) {
    const [year, month] = hoyPeru().split('-').map(Number); const a = anio || year; const m = mes || month
    const scope = this.scopedParams(user, sedeId)
    const params = scope.sedeId ? [a, m, scope.sedeId] : [a, m]
    const [ticketStats, ingresosPorMetodo, topRutas, topClientes, porEstado, porDia] = await Promise.all([
      this.ds.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE t.pagado = true)::int AS pagados, COUNT(*) FILTER (WHERE t.anulado = true)::int AS anulados, COALESCE(SUM(t.total) FILTER (WHERE t.pagado = true), 0) AS monto_cobrado, COALESCE(SUM(GREATEST(t.total - COALESCE((SELECT SUM(abono.monto) FROM pagos abono WHERE abono.ticket_id = t.id), 0), 0)) FILTER (WHERE t.pagado = false AND t.anulado = false), 0) AS monto_pendiente FROM tickets t WHERE EXTRACT(YEAR FROM ${fechaLocalPeru('t.fecha_emision')}) = $1 AND EXTRACT(MONTH FROM ${fechaLocalPeru('t.fecha_emision')}) = $2${scope.receptionTicket(3)}`, params),
      this.ds.query(`SELECT p.metodo_pago, COALESCE(SUM(p.monto), 0) AS monto, COUNT(*)::int AS cantidad FROM pagos p WHERE EXTRACT(YEAR FROM ${fechaLocalPeru('p.created_at')}) = $1 AND EXTRACT(MONTH FROM ${fechaLocalPeru('p.created_at')}) = $2${scope.payment(3)} GROUP BY p.metodo_pago ORDER BY monto DESC`, params),
      this.ds.query(`SELECT o.nombre AS origen, d.nombre AS destino, COUNT(t.id)::int AS total_tickets, COALESCE(SUM(t.total), 0) AS monto FROM tickets t JOIN destinos o ON o.id = t.origen_id JOIN destinos d ON d.id = t.destino_id WHERE EXTRACT(YEAR FROM ${fechaLocalPeru('t.fecha_emision')}) = $1 AND EXTRACT(MONTH FROM ${fechaLocalPeru('t.fecha_emision')}) = $2 AND t.anulado = false${scope.receptionTicket(3)} GROUP BY o.nombre, d.nombre ORDER BY total_tickets DESC LIMIT 5`, params),
      this.ds.query(`SELECT c.razon_social, c.tipo, COUNT(t.id)::int AS envios, COALESCE(SUM(t.total), 0) AS monto_total FROM tickets t JOIN clientes c ON c.id = t.remitente_id WHERE EXTRACT(YEAR FROM ${fechaLocalPeru('t.fecha_emision')}) = $1 AND EXTRACT(MONTH FROM ${fechaLocalPeru('t.fecha_emision')}) = $2 AND t.anulado = false${scope.receptionTicket(3)} GROUP BY c.razon_social, c.tipo ORDER BY monto_total DESC LIMIT 6`, params),
      this.ds.query(`SELECT t.estado, COUNT(*)::int AS cantidad, COALESCE(SUM(t.total), 0) AS monto FROM tickets t WHERE EXTRACT(YEAR FROM ${fechaLocalPeru('t.fecha_emision')}) = $1 AND EXTRACT(MONTH FROM ${fechaLocalPeru('t.fecha_emision')}) = $2${scope.receptionTicket(3)} GROUP BY t.estado ORDER BY cantidad DESC`, params),
      this.ds.query(`SELECT EXTRACT(DAY FROM ${fechaLocalPeru('p.created_at')})::int AS dia, COALESCE(SUM(p.monto), 0) AS monto, COUNT(*)::int AS cantidad FROM pagos p WHERE EXTRACT(YEAR FROM ${fechaLocalPeru('p.created_at')}) = $1 AND EXTRACT(MONTH FROM ${fechaLocalPeru('p.created_at')}) = $2${scope.payment(3)} GROUP BY dia ORDER BY dia`, params),
    ])
    const ts = ticketStats[0] || {}; const totalIngresos = sumMoney(ingresosPorMetodo.map((row: { monto: string }) => row.monto))
    return { periodo: { anio: a, mes: m }, tickets: { total: ts.total || 0, pagados: ts.pagados || 0, anulados: ts.anulados || 0, pendientes: (ts.total || 0) - (ts.pagados || 0) - (ts.anulados || 0), montoCobrado: money(ts.monto_cobrado ?? 0), montoPendiente: money(ts.monto_pendiente ?? 0) }, ingresos: { total: totalIngresos, porMetodo: ingresosPorMetodo.map((row: any) => ({ metodo: row.metodo_pago, monto: money(row.monto ?? 0), cantidad: row.cantidad })) }, topRutas: topRutas.map((row: any) => ({ ...row, monto: money(row.monto ?? 0) })), topClientes: topClientes.map((row: any) => ({ ...row, montoTotal: money(row.monto_total ?? 0) })), porEstado: porEstado.map((row: any) => ({ ...row, monto: money(row.monto ?? 0) })), porDia: porDia.map((row: any) => ({ dia: row.dia, monto: money(row.monto ?? 0), cantidad: row.cantidad })) }
  }

  async comparativo6Meses(user?: any, sedeId?: string) {
    const scope = this.scopedParams(user, sedeId); const params = scope.sedeId ? [scope.sedeId] : []
    const rows = await this.ds.query(`SELECT EXTRACT(YEAR FROM ${fechaLocalPeru('p.created_at')})::int AS anio, EXTRACT(MONTH FROM ${fechaLocalPeru('p.created_at')})::int AS mes, TO_CHAR(${fechaLocalPeru('p.created_at')}, 'Mon') AS mes_nombre, COALESCE(SUM(p.monto), 0) AS ingresos, COUNT(*)::int AS cobros FROM pagos p WHERE p.created_at >= NOW() - INTERVAL '6 months'${scope.payment(1)} GROUP BY anio, mes, mes_nombre ORDER BY anio, mes`, params)
    return rows.map((row: any) => ({ ...row, ingresos: money(row.ingresos) }))
  }

  async pendientesCobro(user?: any, sedeId?: string) {
    const scope = this.scopedParams(user, sedeId); const params = scope.sedeId ? [scope.sedeId] : []
    const rows = await this.ds.query(`SELECT t.numero_ticket, t.total, GREATEST(t.total - COALESCE((SELECT SUM(abono.monto) FROM pagos abono WHERE abono.ticket_id = t.id), 0), 0) AS saldo, t.fecha_emision, t.tipo_entrega, t.estado, o.nombre AS origen, d.nombre AS destino, c.razon_social AS remitente, c.telefono AS tel_remitente FROM tickets t JOIN destinos o ON o.id = t.origen_id JOIN destinos d ON d.id = t.destino_id JOIN clientes c ON c.id = t.remitente_id WHERE t.pagado = false AND t.anulado = false${scope.receptionTicket(1)} ORDER BY t.fecha_emision ASC LIMIT 50`, params)
    return rows.map((row: any) => ({ ...row, total: money(row.total), saldo: money(row.saldo) }))
  }

  async porTipoMercaderia(anio?: number, mes?: number, user?: any, sedeId?: string) {
    const [year, month] = hoyPeru().split('-').map(Number); const scope = this.scopedParams(user, sedeId); const params = scope.sedeId ? [anio || year, mes || month, scope.sedeId] : [anio || year, mes || month]
    const rows = await this.ds.query(`SELECT mi.tipo, COUNT(*)::int AS cantidad, COALESCE(SUM(mi.peso_total), 0) AS peso_total, COALESCE(SUM(mi.total), 0) AS monto_total FROM mercaderia_items mi JOIN tickets t ON t.id = mi.ticket_id WHERE EXTRACT(YEAR FROM ${fechaLocalPeru('t.fecha_emision')}) = $1 AND EXTRACT(MONTH FROM ${fechaLocalPeru('t.fecha_emision')}) = $2 AND t.anulado = false${scope.receptionTicket(3)} GROUP BY mi.tipo ORDER BY monto_total DESC`, params)
    return rows.map((row: any) => ({ ...row, peso_total: decimalNumber(row.peso_total), monto_total: money(row.monto_total) }))
  }

  async dashboardKpis(user?: any, sedeId?: string) {
    const scope = this.scopedParams(user, sedeId); const { inicio: hoy, fin } = limitesDiaPeru(hoyPeru()); const manana = new Date(fin.getTime() + 1)
    const dateParams = scope.sedeId ? [hoy, manana, scope.sedeId] : [hoy, manana]
    const plainParams = scope.sedeId ? [scope.sedeId] : []
    const ticketDateScope = scope.receptionTicket(3)
    const paymentDateScope = scope.payment(3)
    const ticketScope = scope.receptionTicket(1)
    const [hoyStats, cobradoHoy, metodosHoy, pendientes, estados] = await Promise.all([
      this.ds.query(`SELECT COUNT(*)::int AS total FROM tickets t WHERE t.created_at >= ${limiteEnZonaDb('$1')} AND t.created_at < ${limiteEnZonaDb('$2')}${ticketDateScope}`, dateParams),
      this.ds.query(`SELECT COALESCE(SUM(p.monto), 0) AS total, COUNT(*)::int AS cobros FROM pagos p WHERE p.created_at >= ${limiteEnZonaDb('$1')} AND p.created_at < ${limiteEnZonaDb('$2')}${paymentDateScope}`, dateParams),
      this.ds.query(`SELECT p.metodo_pago, COALESCE(SUM(p.monto), 0) AS monto, COUNT(*)::int AS cantidad FROM pagos p WHERE p.created_at >= ${limiteEnZonaDb('$1')} AND p.created_at < ${limiteEnZonaDb('$2')}${paymentDateScope} GROUP BY p.metodo_pago ORDER BY monto DESC`, dateParams),
      this.ds.query(`SELECT COUNT(*)::int AS total, COALESCE(SUM(GREATEST(t.total - COALESCE((SELECT SUM(abono.monto) FROM pagos abono WHERE abono.ticket_id = t.id), 0), 0)), 0) AS monto FROM tickets t WHERE t.pagado = false AND t.anulado = false${ticketScope}`, plainParams),
      this.ds.query(`SELECT t.estado, COUNT(*)::int AS n FROM tickets t WHERE t.anulado = false${ticketScope} GROUP BY t.estado`, plainParams),
    ])
    const est = Object.fromEntries(estados.map((row: any) => [row.estado, row.n]))
    return { hoy: hoyStats[0]?.total || 0, cobradoHoy: money(cobradoHoy[0]?.total ?? 0), cobrosHoy: cobradoHoy[0]?.cobros || 0, porMetodoHoy: metodosHoy.map((row: any) => ({ metodo: row.metodo_pago, monto: money(row.monto ?? 0), cantidad: row.cantidad })), pendientesCobro: pendientes[0]?.total || 0, montoPendiente: money(pendientes[0]?.monto ?? 0), enTransito: est.EN_TRANSITO || 0, desembarque: est.DESEMBARQUE_EN_DESTINO || 0, pendienteEstado: est.PENDIENTE || 0, enReparto: est.EN_REPARTO || 0, entregados: est.ENTREGADO || 0 }
  }
}
