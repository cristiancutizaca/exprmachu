'use client'
import { isDemoSession } from '@/lib/demo-session'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Truck, Search, Ship, Calculator, TrendingUp, TrendingDown,
  Clock, CheckCircle, AlertCircle, Package, Banknote,
  ArrowRight, RefreshCw, Users, BarChart2, Plus
} from 'lucide-react'
import { Card, Badge, Button } from '@/components/ui'
import { BrandHero } from '@/components/brand/BrandIdentity'
import { getKPIs, TICKETS_DB, DESEMBARQUE_DB, PAGOS_HOY } from '@/lib/demo/data'
import { desembarqueApi, reportesApi, ticketsApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { formatMoney } from '@/lib/utils'
import { hoyPeru } from '@/lib/peru-time'
import { canAccessRoute } from '@/components/layout/Sidebar'
import type { Ticket } from '@/types'

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, trend, onClick }: {
  label: string; value: string | number; sub?: string
  icon: any; color: string; trend?: 'up'|'down'|'neutral'; onClick?: () => void
}) {
  return (
    <Card className={`border-t-[3px] border-t-[#f3bc43] hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={18} className="text-white"/>
        </div>
        {trend && (
          <span className={`text-[10px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full
            ${trend==='up' ? 'bg-green-100 text-green-700' : trend==='down' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
            {trend==='up' ? <TrendingUp size={10}/> : trend==='down' ? <TrendingDown size={10}/> : null}
            {trend === 'up' ? '+' : ''}
          </span>
        )}
      </div>
      <p className="text-[24px] font-black text-gray-800 leading-none">{value}</p>
      <p className="text-[12px] font-medium text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </Card>
  )
}

// ─── Ticket row mini ──────────────────────────────────────────────────────────
const ESTADO_STYLE: Record<string, { color: string; label: string }> = {
  PENDIENTE:              { color:'text-amber-600 bg-amber-50',  label:'Pendiente' },
  EN_TRANSITO:            { color:'text-blue-600 bg-blue-50',    label:'En Tránsito' },
  DESEMBARQUE_EN_DESTINO: { color:'text-indigo-600 bg-indigo-50',label:'Desembarque' },
  ENTREGADO:              { color:'text-green-600 bg-green-50',  label:'Entregado' },
  ANULADO:                { color:'text-gray-500 bg-gray-100',   label:'Anulado' },
}

function TicketMini({ ticket }: { ticket: Ticket }) {
  const router = useRouter()
  const est = ESTADO_STYLE[ticket.estado] || { color:'bg-gray-100 text-gray-600', label:ticket.estado }
  return (
    <button onClick={() => router.push('/busqueda')}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-left">
      <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide flex-shrink-0 ${est.color}`}>
        {est.label}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-navy-500 truncate">{ticket.numeroTicket}</p>
        <p className="text-[10px] text-gray-500 truncate">
          {ticket.remitente.razonSocial} → {ticket.destinatario.razonSocial}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[12px] font-bold text-gray-700">{formatMoney(ticket.total)}</p>
        <p className="text-[10px] text-gray-400">{ticket.origen.nombre}→{ticket.destino.nombre}</p>
      </div>
      {!ticket.pagado && !ticket.anulado && (
        <span className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0" title="Pendiente de cobro"/>
      )}
    </button>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const isDemoMode = isDemoSession(token)
  const canReport = canAccessRoute(user?.rol, '/reportes')
  const canUnload = canAccessRoute(user?.rol, '/desembarque')
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState('')
  const [kpi, setKpi] = useState<(ReturnType<typeof getKPIs> & {
    cobradoHoy?: number; cobrosHoy?: number; porMetodoHoy?: Array<{ metodo: string; monto: number }>
  }) | null>(null)
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([])
  const [desembarques, setDesembarques] = useState<Array<Pick<typeof DESEMBARQUE_DB[number],
    'id' | 'numeroTicket' | 'destinatario' | 'bultos' | 'peso' | 'estado'>>>([])
  const [pendDesembarque, setPendDesembarque] = useState(0)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        if (isDemoMode) {
          setHasLoaded(true)
          setKpi(getKPIs())
          setRecentTickets([...TICKETS_DB].sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision)).slice(0, 5))
          const pending = DESEMBARQUE_DB.filter(d => d.estado === 'PENDIENTE_VERIFICACION')
          setDesembarques(pending.slice(0, 3))
          setPendDesembarque(pending.length)
          return
        }
        const [year, month] = hoyPeru().split('-').map(Number)
        const [report, monthly, tickets, unloading] = await Promise.all([
          canReport ? reportesApi.dashboard() : null,
          canReport ? reportesApi.resumenMes(year, month) : null,
          ticketsApi.buscar({}, 1, 5),
          canUnload ? desembarqueApi.listar({ estado: 'PENDIENTE_VERIFICACION', limit: 3 }) : null,
        ])
        if (!active) return
        if (report && monthly) setKpi({ ...report.data, ticketsHoy: report.data.hoy,
          totalMes: monthly.data.tickets.total, cobradosMes: monthly.data.ingresos.total })
        setHasLoaded(true)
        setRecentTickets(tickets.data.data)
        if (unloading) {
          setPendDesembarque(unloading.data.total)
          setDesembarques(unloading.data.data.map((item: { id: string; ticket: Ticket; estado: string }) => ({
            id: item.id, estado: item.estado, numeroTicket: item.ticket.numeroTicket,
            destinatario: item.ticket.destinatario?.razonSocial || '—',
            bultos: item.ticket.bultos?.length ?? 0,
            peso: item.ticket.bultos?.reduce((sum, bulto) => sum + Number(bulto.pesoReal ?? 0), 0) ?? 0,
          })))
        }
      } catch (error: any) {
        if (active) setError(error.response?.data?.message || 'No se pudo cargar el dashboard')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [canReport, canUnload, isDemoMode, refresh])

  const loadDashboard = () => setRefresh(value => value + 1)
  if (loading && !hasLoaded) return <p role="status">Cargando el dashboard…</p>
  if (error) return <Card><p role="alert">{error}</p><Button onClick={loadDashboard}>Reintentar</Button></Card>

  const greeting = () => {
    const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit' }).format(new Date()))
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const totalCajaDia = isDemoMode ? PAGOS_HOY.reduce((s, p) => s + p.monto, 0) : Number(kpi?.cobradoHoy ?? 0)
  const paymentBreakdown = isDemoMode
    ? (['EFECTIVO', 'TRANSFERENCIA', 'YAPE', 'TARJETA'] as const).map(metodo => ({ metodo, monto: PAGOS_HOY.filter(p => p.metodoPago === metodo).reduce((s, p) => s + p.monto, 0) }))
    : (kpi?.porMetodoHoy || [])

  return (
    <div className="pb-8 space-y-5">
      {/* Panel de bienvenida con marca corporativa y accesos operativos */}
      <BrandHero
        kicker="Centro de operaciones · Expreso Machupicchu"
        title={`${greeting()}, ${user?.nombre?.split(' ')[0] || 'equipo'}`}
        description="Recepción, custodia, movimiento de cargas, caja y entregas. Una vista unificada para operar cada sede con trazabilidad."
        icon={Truck}
        meta={<span>{new Date().toLocaleDateString('es-PE',{ weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'America/Lima' })} · Sede {user?.sede || 'asignada'} · {isDemoMode ? 'MODO DEMO · Datos de ejemplo' : loading ? 'Actualizando información' : 'Sesión real'}</span>}
        actions={<>
          {canAccessRoute(user?.rol, '/recepcion') && <Button variant="primary" size="md" icon={<Plus size={15}/>} onClick={() => router.push('/recepcion')}>Nueva recepción</Button>}
          <button className="inline-flex items-center gap-2 rounded-lg border border-white/35 bg-white/10 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-white/20 transition-colors" onClick={() => router.push('/busqueda')}><Search size={14}/>Buscar ticket</button>
        </>}
      />
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[11px] font-black uppercase tracking-[.16em] text-[#647c94]">Indicadores de la sede</p><p className="text-[12px] text-gray-500 mt-1">Datos operativos y financieros del período actual.</p></div>
        <Button variant="outline" size="sm" loading={loading} icon={<RefreshCw size={13}/>} onClick={() => void loadDashboard()}>Actualizar</Button>
      </div>

      {/* KPIs principales */}
      {kpi && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Tickets hoy"          value={kpi.ticketsHoy}       icon={Truck}       color="bg-[#0e3257]"      onClick={() => router.push('/busqueda')}/>
        <KpiCard label="Cobrado hoy"           value={formatMoney(totalCajaDia)} icon={Banknote}    color="bg-green-700"      onClick={() => router.push('/caja-diaria')}/>
        <KpiCard label="Pend. de cobro"        value={kpi.pendientesCobro}  icon={AlertCircle} color="bg-amber-500" sub={formatMoney(kpi.montoPendiente)} onClick={() => router.push('/busqueda')}/>
        <KpiCard label="En tránsito"           value={kpi.enTransito}       icon={RefreshCw}   color="bg-[#12649a]"  onClick={() => router.push('/transbordo')}/>
      </div>

      {/* Segunda fila KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Para desembarque"      value={kpi.desembarque}      icon={Ship}        color="bg-indigo-600" onClick={() => router.push('/desembarque')}/>
        {canUnload && <KpiCard label="Pendientes verificar"  value={pendDesembarque}      icon={Package}     color="bg-purple-600" onClick={() => router.push('/desembarque')}/>}
        <KpiCard label="Total tickets mes"     value={kpi.totalMes}         icon={BarChart2}   color="bg-teal-600"   onClick={() => router.push('/busqueda')}/>
        <KpiCard label="Cobrado este mes"      value={formatMoney(kpi.cobradosMes)} icon={TrendingUp} color="bg-emerald-600" onClick={() => router.push('/caja-diaria')}/>
      </div>
      </>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Actividad reciente */}
        <div className="lg:col-span-2">
          <Card padding={false} className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400"/>
                <span className="text-[13px] font-semibold text-gray-700">Actividad reciente</span>
              </div>
              <button onClick={() => router.push('/busqueda')}
                className="text-[11px] text-sky-brand hover:underline flex items-center gap-1">
                Ver todos <ArrowRight size={11}/>
              </button>
            </div>
            {!recentTickets.length && <p className="p-4 text-sm text-gray-500">Sin tickets registrados.</p>}
            {recentTickets.map(t => <TicketMini key={t.id} ticket={t}/>)}
          </Card>
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">
          {/* Caja del día resumen */}
          {kpi && <Card>
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={14} className="text-gray-400"/>
              <span className="text-[13px] font-semibold text-gray-700">Caja de hoy</span>
            </div>
            <p className="text-[28px] font-black text-green-600">
              {formatMoney(totalCajaDia)}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{isDemoMode ? PAGOS_HOY.length : Number(kpi.cobrosHoy || 0)} cobros realizados</p>
            <div className="mt-3 space-y-2">
              {paymentBreakdown.map((row: any) => {
                const m = row.metodo
                const monto = Number(row.monto || 0)
                if (!monto) return null
                const pct = totalCajaDia > 0 ? (monto / totalCajaDia * 100) : 0
                const colors: Record<string,string> = {
                  EFECTIVO:'bg-green-500', TRANSFERENCIA:'bg-blue-500',
                  YAPE:'bg-purple-500', TARJETA:'bg-orange-500'
                }
                return (
                  <div key={m}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-gray-500">{m}</span>
                      <span className="font-medium text-gray-700">{formatMoney(monto)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[m]} rounded-full`} style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={() => router.push('/caja-diaria')}
              className="mt-3 w-full text-center text-[11px] text-sky-brand hover:underline flex items-center justify-center gap-1">
              Ver caja completa <ArrowRight size={11}/>
            </button>
          </Card>}

          {/* Pendientes de desembarque */}
          {canUnload && <Card>
            <div className="flex items-center gap-2 mb-3">
              <Ship size={14} className="text-gray-400"/>
              <span className="text-[13px] font-semibold text-gray-700">Desembarque</span>
              {pendDesembarque > 0 && (
                <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pendDesembarque} pendientes
                </span>
              )}
            </div>
            <div className="space-y-2">
              {!desembarques.length && <p className="text-xs text-gray-500">Sin desembarques pendientes.</p>}
              {desembarques.map(d => (
                <div key={d.id} className="flex items-start gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                    d.estado==='PENDIENTE_VERIFICACION' ? 'bg-amber-400' :
                    d.estado==='VERIFICADO' ? 'bg-blue-400' : 'bg-green-400'
                  }`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-700 truncate">{d.numeroTicket}</p>
                    <p className="text-[10px] text-gray-500 truncate">{d.destinatario}</p>
                    <p className="text-[10px] text-gray-400">{d.bultos} bultos · {d.peso}kg</p>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                    d.estado==='PENDIENTE_VERIFICACION' ? 'bg-amber-100 text-amber-700' :
                    d.estado==='VERIFICADO' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-700'
                  }`}>
                    {d.estado==='PENDIENTE_VERIFICACION'?'PEND':d.estado==='VERIFICADO'?'VERIF':'ENTREGADO'}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => router.push('/desembarque')}
              className="mt-2 w-full text-center text-[11px] text-sky-brand hover:underline flex items-center justify-center gap-1">
              Ir a desembarque <ArrowRight size={11}/>
            </button>
          </Card>}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { label:'Nueva Recepción',   Icon:Truck,       href:'/recepcion',   color:'bg-navy-500',   tip:'Ctrl+N' },
            { label:'Buscar Ticket',     Icon:Search,      href:'/busqueda',    color:'bg-sky-brand',  tip:'Ctrl+F' },
            { label:'Desembarque',       Icon:Ship,        href:'/desembarque', color:'bg-indigo-600', tip:'' },
            { label:'Manifiesto',        Icon:Package,     href:'/manifiesto',  color:'bg-teal-600',   tip:'' },
            { label:'Caja Diaria',       Icon:Calculator,  href:'/caja-diaria', color:'bg-green-600',  tip:'Ctrl+4' },
            { label:'Comprobantes',      Icon:CheckCircle, href:'/comprobantes',color:'bg-purple-600', tip:'' },
          ].filter(item => canAccessRoute(user?.rol, item.href)).map(({ label, Icon, href, color, tip }) => (
            <button key={href} onClick={() => router.push(href)}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-[#d9e6f0]
                         hover:border-sky-brand hover:shadow-md transition-all group">
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center
                               group-hover:scale-110 transition-transform`}>
                <Icon size={18} className="text-white"/>
              </div>
              <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">{label}</span>
              {tip && <span className="text-[9px] text-gray-300 font-mono">{tip}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
