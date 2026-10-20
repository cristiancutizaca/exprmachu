import { ReportesService } from './reportes.service'
import { RolUsuario } from '../database/entities/usuario.entity'

describe('ReportesService multisede V8', () => {
  function makeDb() {
    const queries: Array<{ sql: string; params: any[] }> = []
    const ds: any = {
      queries,
      query: jest.fn(async (sql: string, params: any[] = []) => {
        queries.push({ sql, params })
        const scoped = params.includes('sede-cusco')
        if (sql.includes('COUNT(*)::int AS total, COUNT(*) FILTER')) return [{ total: scoped ? 5 : 7, pagados: 3, anulados: 0, monto_cobrado: 300, monto_pendiente: 200 }]
        if (sql.includes('metodo_pago')) return [{ metodo_pago: 'EFECTIVO', monto: scoped ? 80 : 700, cantidad: scoped ? 1 : 7 }]
        if (sql.includes('GROUP BY o.nombre')) return []
        if (sql.includes('GROUP BY c.razon_social')) return []
        if (sql.includes('SELECT t.estado')) return []
        if (sql.includes('EXTRACT(DAY FROM p.created_at)')) return []
        return []
      }),
    }
    return { ds, queries }
  }

  it('atribuye ventas a sedeRecepcionId y no usa usuario_creacion_id', async () => {
    const localDb = makeDb()
    const local = await new ReportesService(localDb.ds).resumenMes(2026, 8, { rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-cusco' })
    expect(local.tickets.total).toBe(5)
    expect(localDb.queries.some(query => query.sql.includes('t.sede_recepcion_id = $3') && query.params.includes('sede-cusco'))).toBe(true)
    expect(localDb.queries.every(query => !query.sql.includes('usuario_creacion_id'))).toBe(true)

    const globalDb = makeDb()
    const global = await new ReportesService(globalDb.ds).resumenMes(2026, 8, { rol: RolUsuario.SUPERVISOR })
    expect(global.tickets.total).toBe(7)
    expect(globalDb.queries.every(query => !query.params.includes('sede-cusco'))).toBe(true)
  })

  it('atribuye cobros a Pago.sedeId aunque el ticket sea de otra recepción', async () => {
    const db = makeDb()
    const result = await new ReportesService(db.ds).resumenMes(2026, 8, { rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-cusco' })
    expect(result.ingresos.total).toBe(80)
    expect(db.queries.some(query => query.sql.includes('p.sede_id = $3') && query.params.includes('sede-cusco'))).toBe(true)
    expect(db.queries.some(query => query.sql.includes('t.sede_recepcion_id = $3') && query.params.includes('sede-cusco'))).toBe(true)
  })

  it('dashboard separa tickets por recepción y cobros por sede de pago', async () => {
    const db = makeDb()
    await new ReportesService(db.ds).dashboardKpis({ rol: RolUsuario.ADMIN_SEDE, sedeId: 'sede-cusco' })
    expect(db.queries.some(query => query.sql.includes('t.sede_recepcion_id = $3'))).toBe(true)
    expect(db.queries.some(query => query.sql.includes('p.sede_id = $3'))).toBe(true)
    expect(db.queries.every(query => !query.sql.includes('usuario_creacion_id'))).toBe(true)
  })
})
