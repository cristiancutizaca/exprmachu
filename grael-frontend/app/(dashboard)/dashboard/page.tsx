'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Truck, Search, Ship, Calculator, TrendingUp, TrendingDown,
  Clock, CheckCircle, AlertCircle, Package, Banknote,
  ArrowRight, RefreshCw, Users, BarChart2, Plus
} from 'lucide-react'
import { Card, Badge, Button } from '@/components/ui'
import { getKPIs, TICKETS_DB, DESEMBARQUE_DB, PAGOS_HOY } from '@/lib/data'
import { desembarqueApi, reportesApi, ticketsApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import type { Ticket } from '@/types'

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, trend, onClick }: {
  label: string; value: string | number; sub?: string
  icon: any; color: string; trend?: 'up'|'down'|'neutral'; onClick?: () => void
}) {
  return (
    <Card className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? '' : 'cursor-default'}`}
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
        <p className="text-[12px] font-bold text-gray-700">S/ {ticket.total.toFixed(0)}</p>
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
  const isDemoMode = !token || token.startsWith('demo-')
  const [loading, setLoading] = useState(false)
  const [kpi, setKpi] = useState<any>(() => getKPIs())
  const [recentTickets, setRecentTickets] = useState<Ticket[]>(() => [...TICKETS_DB].sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision)).slice(0, 5))
  const [desembarques, setDesembarques] = useState<any[]>(DESEMBARQUE_DB.slice(0, 3))

  const loadDashboard = useCallback(async () => {
    if (isDemoMode) { setKpi(getKPIs()); setRecentTickets([...TICKETS_DB].sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision)).slice(0, 5)); setDesembarques(DESEMBARQUE_DB.slice(0, 3)); return }
    setLoading(true)
    try {
      const now = new Date()
      const [dashboardResponse, monthlyResponse, ticketsResponse, desembarqueResponse] = await Promise.all([
        reportesApi.dashboard(), reportesApi.resumenMes(now.getFullYear(), now.getMonth() + 1),
        ticketsApi.buscar({}, 1, 5), desembarqueApi.listar({ estado: 'PENDIENTE_VERIFICACION' }),
      ])
      const dashboard = dashboardResponse.data
      const monthly = monthlyResponse.data
      const ticketRows = ticketsResponse.data?.data || []
      const desembarqueRows = desembarqueResponse.data?.data || desembarqueResponse.data || []
      setKpi({ ...dashboard, ticketsHoy: dashboard.ticketsHoy ?? dashboard.hoy ?? 0, totalMes: monthly.tickets?.total || 0, cobradosMes: monthly.ingresos?.total || 0, montoPendiente: dashboard.montoPendiente ?? monthly.tickets?.montoPendiente ?? 0, porMetodoHoy: dashboard.porMetodoHoy || [] })
      setRecentTickets(ticketRows)
      setDesembarques(desembarqueRows.slice(0, 3).map((item: any) => ({ numeroTicket: item.ticket?.numeroTicket || item.ticketId, destinatario: item.ticket?.destinatario?.razonSocial || '—', bultos: item.ticket?.bultos?.length || 0, peso: item.ticket?.bultos?.reduce((sum: number, bulto: any) => sum + Number(bulto.pesoReal || 0), 0) || 0, estado: item.estado })))
    } catch (error: any) {
      console.error(error)
    } finally { setLoading(false) }
  }, [isDemoMode])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const totalCajaDia = isDemoMode ? PAGOS_HOY.reduce((s, p) => s + p.monto, 0) : Number(kpi.cobradoHoy || 0)
  const pendDesembarque = isDemoMode ? DESEMBARQUE_DB.filter(d => d.estado === 'PENDIENTE_VERIFICACION').length : Number(kpi.pendienteEstado || 0)
  const paymentBreakdown = isDemoMode
    ? (['EFECTIVO', 'TRANSFERENCIA', 'YAPE', 'TARJETA'] as const).map(metodo => ({ metodo, monto: PAGOS_HOY.filter(p => p.metodoPago === metodo).reduce((s, p) => s + p.monto, 0) }))
    : (kpi.porMetodoHoy || [])

  return (
    <div className="pb-8 space-y-5">
      {/* Saludo + acciones rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {!isDemoMode && <span className="text-[10px] text-green-700">Sesión real · {loading ? 'actualizando…' : 'API conectada'}</span>}
        <div>
          <h1 className="text-[20px] font-black text-navy-500">
            {greeting()}, {user?.nombre?.split(' ')[0]} 👋
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('es-PE',{ weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            {' — '}<span className="font-medium text-navy-400">Sede {user?.sede}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={() => router.push('/recepcion')}>
            Nueva Recepción
          </Button>
          <Button variant="outline" size="sm" icon={<Search size={13}/>} onClick={() => router.push('/busqueda')}>
            Buscar Ticket
          </Button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Tickets hoy"          value={kpi.ticketsHoy}       icon={Truck}       color="bg-navy-500"  trend="up"      onClick={() => router.push('/busqueda')}/>
        <KpiCard label="Cobrado hoy"           value={`S/ ${totalCajaDia.toLocaleString('es-PE',{minimumFractionDigits:2})}`} icon={Banknote}    color="bg-green-600" trend="up"      onClick={() => router.push('/caja-diaria')}/>
        <KpiCard label="Pend. de cobro"        value={kpi.pendientesCobro}  icon={AlertCircle} color="bg-amber-500" sub={`S/ ${kpi.montoPendiente.toLocaleString('es-PE',{minimumFractionDigits:0})}`} onClick={() => router.push('/busqueda')}/>
        <KpiCard label="En tránsito"           value={kpi.enTransito}       icon={RefreshCw}   color="bg-sky-brand" trend="neutral"  onClick={() => router.push('/transbordo')}/>
      </div>

      {/* Segunda fila KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Para desembarque"      value={kpi.desembarque}      icon={Ship}        color="bg-indigo-600" onClick={() => router.push('/desembarque')}/>
        <KpiCard label="Pendientes verificar"  value={pendDesembarque}      icon={Package}     color="bg-purple-600" onClick={() => router.push('/desembarque')}/>
        <KpiCard label="Total tickets mes"     value={kpi.totalMes}         icon={BarChart2}   color="bg-teal-600"   onClick={() => router.push('/busqueda')}/>
        <KpiCard label="Cobrado este mes"      value={`S/ ${kpi.cobradosMes.toLocaleString('es-PE',{minimumFractionDigits:0})}`} icon={TrendingUp} color="bg-emerald-600" onClick={() => router.push('/caja-diaria')}/>
      </div>

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
            {recentTickets.map(t => <TicketMini key={t.id} ticket={t}/>)}
          </Card>
        </div>

        {/* Panel derecho */}
        <div className="space-y-4">
          {/* Caja del día resumen */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Calculator size={14} className="text-gray-400"/>
              <span className="text-[13px] font-semibold text-gray-700">Caja de hoy</span>
            </div>
            <p className="text-[28px] font-black text-green-600">
              S/ {totalCajaDia.toLocaleString('es-PE',{minimumFractionDigits:2})}
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
                      <span className="font-medium text-gray-700">S/ {monto.toFixed(2)}</span>
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
          </Card>

          {/* Pendientes de desembarque */}
          <Card>
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
          </Card>
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
          ].map(({ label, Icon, href, color, tip }) => (
            <button key={href} onClick={() => router.push(href)}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200
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
