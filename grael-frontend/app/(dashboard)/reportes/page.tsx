'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  BarChart2, TrendingUp, Download, RefreshCw,
  DollarSign, Package, Users, AlertCircle, ChevronDown
} from 'lucide-react'
import { Button, Card, PageHeader, FormField, Select } from '@/components/ui'
import { KpiSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { formatMoney, formatMoneyShort, MESES, METODO_COLORS, ESTADO_COLORS, exportToCSV } from '@/lib/utils'
import { TICKETS_DB, PAGOS_HOY } from '@/lib/data'
import { reportesApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import toast from 'react-hot-toast'

// ─── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBar({ value, max, color = 'bg-sky-brand', label }: {
  value: number; max: number; color?: string; label?: string
}) {
  const pct = max > 0 ? (value / max * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-[11px] text-gray-600 font-medium w-24 text-right flex-shrink-0">
        {label || formatMoneyShort(value)}
      </span>
    </div>
  )
}

// ─── Gráfica de barras simple (SVG) ──────────────────────────────────────────
function BarChart({ data, height = 140 }: {
  data: { label: string; value: number; color?: string }[]
  height?: number
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = Math.floor(100 / data.length) - 2

  return (
    <div className="relative" style={{ height }}>
      <svg width="100%" height={height} className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line key={i} x1="0" y1={height - pct * height} x2="100%" y2={height - pct * height}
            stroke="#f0f0f0" strokeWidth="1"/>
        ))}
        {data.map((d, i) => {
          const x   = `${i * (100 / data.length) + 1}%`
          const h   = (d.value / max) * (height - 20)
          const y   = height - h - 20
          const color = d.color || '#3b97c8'
          return (
            <g key={i}>
              <rect x={x} y={y} width={`${barW}%`} height={h}
                fill={color} rx="3" className="hover:opacity-80 transition-opacity cursor-pointer">
                <title>{d.label}: {formatMoney(d.value)}</title>
              </rect>
              <text x={`${i * (100/data.length) + barW/2 + 1}%`} y={height - 4}
                textAnchor="middle" fontSize="9" fill="#666">
                {d.label.length > 4 ? d.label.slice(0,4) : d.label}
              </text>
              {d.value > 0 && (
                <text x={`${i * (100/data.length) + barW/2 + 1}%`} y={y - 3}
                  textAnchor="middle" fontSize="9" fill={color} fontWeight="bold">
                  {formatMoneyShort(d.value).replace('S/ ','')}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Dona simple ──────────────────────────────────────────────────────────────
function DonutChart({ data }: {
  data: { label: string; value: number; color: string }[]
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return <div className="text-center text-gray-400 text-[12px] py-8">Sin datos</div>

  let offset = 0
  const radius = 40; const cx = 60; const cy = 60; const circ = 2 * Math.PI * radius
  const slices = data.map(d => {
    const pct = d.value / total
    const dash = pct * circ
    const slice = { ...d, dash, offset, pct }
    offset += dash
    return slice
  })

  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={radius} fill="transparent" stroke="#f0f0f0" strokeWidth="18"/>
        {slices.filter(s => s.pct > 0).map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={radius} fill="transparent"
            stroke={s.color} strokeWidth="18"
            strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={-s.offset}
            style={{ transform:`rotate(-90deg)`, transformOrigin:`${cx}px ${cy}px` }}>
            <title>{s.label}: {formatMoney(s.value)} ({(s.pct*100).toFixed(1)}%)</title>
          </circle>
        ))}
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1c3a5c">
          {formatMoneyShort(total).replace('S/ ','')}
        </text>
        <text x={cx} y={cy+10} textAnchor="middle" fontSize="8" fill="#999">Total</text>
      </svg>
      <div className="space-y-1.5 flex-1">
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background:s.color }}/>
            <span className="text-[11px] text-gray-600 flex-1 truncate">{s.label}</span>
            <span className="text-[11px] font-semibold text-gray-700">{(s.pct*100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Datos mock para reportes ─────────────────────────────────────────────────
function getReporteData(anio: number, mes: number) {
  const tickets   = TICKETS_DB
  const pagados   = tickets.filter(t => t.pagado && !t.anulado)
  const anulados  = tickets.filter(t => t.anulado)
  const pendiente = tickets.filter(t => !t.pagado && !t.anulado)
  const totalCobrado = PAGOS_HOY.reduce((s,p)=>s+p.monto, 0)

  const porMetodo = PAGOS_HOY.reduce((acc, p) => {
    acc[p.metodoPago] = (acc[p.metodoPago]||0) + p.monto; return acc
  }, {} as Record<string,number>)

  const porDia = Array.from({length:24}, (_,i) => ({
    dia: i+1, monto: Math.random() * 3000, cantidad: Math.floor(Math.random()*5)
  })).filter((_,i) => i < 24)

  const topRutas = [
    { origen:'PIURA',    destino:'CUSCO',  total_tickets:8,  monto:18500 },
    { origen:'LIMA',     destino:'CUSCO',  total_tickets:6,  monto:12400 },
    { origen:'AREQUIPA', destino:'CUSCO',  total_tickets:4,  monto:8200  },
    { origen:'CUSCO',    destino:'LIMA',   total_tickets:3,  monto:6100  },
    { origen:'PUNO',     destino:'CUSCO',  total_tickets:2,  monto:4800  },
  ]

  const topClientes = [
    { razon_social:'CILMEC S.A.C.',         tipo:'JURIDICO', envios:4, montoTotal:14200 },
    { razon_social:'IMPORTACIONES DEL SUR', tipo:'JURIDICO', envios:3, montoTotal:9800  },
    { razon_social:'FERRETERIA LOS ANDES',  tipo:'JURIDICO', envios:2, montoTotal:6400  },
    { razon_social:'ANA FLORES QUISPE',     tipo:'NATURAL',  envios:3, montoTotal:4200  },
    { razon_social:'CARLOS MENDOZA RIOS',   tipo:'NATURAL',  envios:2, montoTotal:3100  },
  ]

  const porMercaderia = [
    { tipo:'CARGA GENERAL', cantidad:8, peso_total:890,  monto_total:21000 },
    { tipo:'ALIMENTOS',     cantidad:3, peso_total:600,  monto_total:15600 },
    { tipo:'ENCOMIENDA',    cantidad:6, peso_total:150,  monto_total:8200  },
    { tipo:'ELECTRODOMÉSTICOS',cantidad:4,peso_total:200,monto_total:7400  },
    { tipo:'TEXTILES',      cantidad:5, peso_total:225,  monto_total:6500  },
    { tipo:'FRÁGIL',        cantidad:3, peso_total:30,   monto_total:3200  },
  ]

  return {
    periodo: { anio, mes },
    tickets: { total:tickets.length, pagados:pagados.length, anulados:anulados.length, pendientes:pendiente.length, montoCobrado:totalCobrado, montoPendiente:pendiente.reduce((s,t)=>s+t.total,0) },
    ingresos: { total:totalCobrado, porMetodo: Object.entries(porMetodo).map(([metodo,monto])=>({ metodo, monto, cantidad:PAGOS_HOY.filter(p=>p.metodoPago===metodo).length })) },
    topRutas, topClientes, porDia, porMercaderia,
    comparativo: Array.from({length:6}, (_,i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5-i))
      return { anio:d.getFullYear(), mes:d.getMonth()+1, mes_nombre:MESES[d.getMonth()].slice(0,3), ingresos: 8000 + Math.random()*18000, cobros: 15 + Math.floor(Math.random()*30) }
    }),
  }
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────
export default function ReportesPage() {
  const now = new Date()
  const [anio, setAnio] = useState(now.getFullYear())
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'resumen'|'rutas'|'clientes'|'mercaderia'>('resumen')
  const [data, setData] = useState(() => getReporteData(anio, mes))

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 250))
        setData(getReporteData(anio, mes))
        toast.success('Reporte Demo actualizado')
      } else {
        const [summaryResponse, comparativeResponse, merchandiseResponse] = await Promise.all([
          reportesApi.resumenMes(anio, mes), reportesApi.comparativo(), reportesApi.porMercaderia(anio, mes),
        ])
        const summary = summaryResponse.data
        setData({ ...summary, comparativo: comparativeResponse.data || [], porMercaderia: merchandiseResponse.data || [] })
        toast.success('Reporte real actualizado')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo actualizar el reporte')
    } finally { setLoading(false) }
  }, [anio, mes, isDemoMode])

  useEffect(() => { void reload() }, [reload])

  const maxDia = Math.max(...data.porDia.map(d=>d.monto), 1)

  return (
    <div className="pb-8 space-y-5">
      <PageHeader
        title="Reportes y Estadísticas"
        subtitle={isDemoMode ? 'Modo Demo — indicadores calculados localmente' : 'Sesión real — indicadores provenientes del API'}
        actions={
          <div className="flex gap-2">
            <FormField label="" className="w-[100px]">
              <Select value={mes} onChange={e=>setMes(+e.target.value)} className="text-[12px]">
                {MESES.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
              </Select>
            </FormField>
            <FormField label="" className="w-[90px]">
              <Select value={anio} onChange={e=>setAnio(+e.target.value)} className="text-[12px]">
                {[2024,2025,2026].map(y=><option key={y}>{y}</option>)}
              </Select>
            </FormField>
            <Button variant="outline" size="sm" icon={<RefreshCw size={13} className={loading?'animate-spin':''}/>} onClick={reload}>
              Actualizar
            </Button>
            <Button variant="secondary" size="sm" icon={<Download size={13}/>}
              onClick={()=>{
                exportToCSV(data.topRutas.map(r=>({Origen:r.origen,Destino:r.destino,Tickets:r.total_tickets,Monto:r.monto})), 'top_rutas')
                toast.success('CSV exportado')
              }}>
              Exportar
            </Button>
          </div>
        }
      />

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? [0,1,2,3].map(i=><KpiSkeleton key={i}/>) : [
          { label:'Tickets del mes',    value:data.tickets.total,              sub:`${data.tickets.pagados} pagados`,       icon:Package,    color:'bg-navy-500',  textColor:'text-navy-500' },
          { label:'Ingresado',          value:formatMoneyShort(data.ingresos.total), sub:`${data.ingresos.total.toFixed(2)} S/.`, icon:DollarSign, color:'bg-green-600', textColor:'text-green-600' },
          { label:'Pendiente de cobro', value:data.tickets.pendientes,         sub:formatMoneyShort(data.tickets.montoPendiente), icon:AlertCircle, color:'bg-amber-500', textColor:'text-amber-600' },
          { label:'Anulados',           value:data.tickets.anulados,           sub:`${((data.tickets.anulados/Math.max(data.tickets.total,1))*100).toFixed(1)}% del total`, icon:BarChart2, color:'bg-red-500', textColor:'text-red-600' },
        ].map(({label,value,sub,icon:Icon,color,textColor})=>(
          <Card key={label}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${color}`}><Icon size={16} className="text-white"/></div>
            </div>
            <p className={`text-[24px] font-black ${textColor} leading-none`}>{value}</p>
            <p className="text-[12px] font-medium text-gray-500 mt-1">{label}</p>
            <p className="text-[10px] text-gray-400">{sub}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['resumen','rutas','clientes','mercaderia'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all capitalize ${
              tab===t ? 'bg-white text-navy-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'resumen' ? 'Resumen' : t === 'rutas' ? 'Rutas' : t === 'clientes' ? 'Clientes' : 'Mercadería'}
          </button>
        ))}
      </div>

      {/* RESUMEN */}
      {tab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gráfica por día */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[13px] font-semibold text-gray-700">Ingresos del mes</p>
                <p className="text-[11px] text-gray-400">{MESES[mes-1]} {anio} — por día</p>
              </div>
              <p className="text-[18px] font-black text-green-600">{formatMoney(data.ingresos.total)}</p>
            </div>
            <BarChart
              data={data.porDia.slice(0,15).map(d=>({ label:`${d.dia}`, value:d.monto, color:'#3b97c8' }))}
              height={160}
            />
          </Card>

          {/* Distribución por método */}
          <Card>
            <p className="text-[13px] font-semibold text-gray-700 mb-4">Método de pago</p>
            <DonutChart
              data={data.ingresos.porMetodo.map(m=>({
                label:m.metodo, value:m.monto,
                color: METODO_COLORS[m.metodo] || '#999'
              }))}
            />
          </Card>

          {/* Comparativo 6 meses */}
          <Card className="lg:col-span-2">
            <p className="text-[13px] font-semibold text-gray-700 mb-4">Comparativo últimos 6 meses</p>
            <BarChart
              data={data.comparativo.map(c=>({ label:c.mes_nombre, value:c.ingresos, color:'#1e4d87' }))}
              height={140}
            />
          </Card>

          {/* Por estado */}
          <Card>
            <p className="text-[13px] font-semibold text-gray-700 mb-3">Estado de tickets</p>
            <div className="space-y-2.5">
              {[
                { key:'PENDIENTE',              label:'Pendientes',  v:data.tickets.pendientes },
                { key:'EN_TRANSITO',            label:'En Tránsito', v:2 },
                { key:'DESEMBARQUE_EN_DESTINO', label:'Desembarque', v:2 },
                { key:'ENTREGADO',              label:'Entregados',  v:3 },
                { key:'ANULADO',                label:'Anulados',    v:data.tickets.anulados },
              ].map(({key,label,v})=>{
                const est = ESTADO_COLORS[key]
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${est.bg.replace('bg-','bg-').replace('100','500')}`}
                      style={{background: key==='PENDIENTE'?'#f59e0b':key==='EN_TRANSITO'?'#3b82f6':key==='DESEMBARQUE_EN_DESTINO'?'#6366f1':key==='ENTREGADO'?'#22c55e':'#9ca3af'}}/>
                    <span className="text-[12px] text-gray-600 flex-1">{label}</span>
                    <span className="text-[13px] font-bold text-gray-800">{v}</span>
                  </div>
                )
              })}
              <div className="border-t pt-2 flex justify-between">
                <span className="text-[12px] text-gray-500 font-medium">Total</span>
                <span className="text-[13px] font-black text-navy-500">{data.tickets.total}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* RUTAS */}
      {tab === 'rutas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-gray-700">Top 5 rutas por tickets</p>
              <Button variant="ghost" size="xs" icon={<Download size={11}/>}
                onClick={()=>exportToCSV(data.topRutas.map(r=>({Origen:r.origen,Destino:r.destino,Tickets:r.total_tickets,Monto:r.monto})),'rutas')}>
                CSV
              </Button>
            </div>
            <div className="space-y-3">
              {data.topRutas.map((r,i)=>(
                <div key={i}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="font-medium text-gray-700">{r.origen} → {r.destino}</span>
                    <span className="text-gray-500">{r.total_tickets} tickets</span>
                  </div>
                  <MiniBar value={r.total_tickets} max={data.topRutas[0].total_tickets}
                    label={`${r.total_tickets} tickets`} color="bg-sky-brand"/>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-[13px] font-semibold text-gray-700 mb-3">Por monto cobrado</p>
            <BarChart
              data={data.topRutas.map((r,i)=>({
                label:`${r.origen.slice(0,3)}→${r.destino.slice(0,3)}`,
                value: r.monto,
                color: ['#1c3a5c','#1e4d87','#3b97c8','#7ec8e8','#a8d8ea'][i]
              }))}
              height={160}
            />
          </Card>
        </div>
      )}

      {/* CLIENTES */}
      {tab === 'clientes' && (
        <Card padding={false} className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-[13px] font-semibold text-gray-700">Top clientes remitentes</p>
            <Button variant="ghost" size="xs" icon={<Download size={11}/>}
              onClick={()=>exportToCSV(data.topClientes.map(c=>({Cliente:c.razon_social,Tipo:c.tipo,Envios:c.envios,Monto:c.montoTotal})),'clientes')}>
              Exportar CSV
            </Button>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['#','Cliente','Tipo','Envíos','Monto Total','% del Total'].map(h=>(
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.topClientes.map((c,i)=>{
                const pct = (c.montoTotal / data.ingresos.total * 100).toFixed(1)
                return (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-[12px] font-bold text-gray-400">#{i+1}</td>
                    <td className="px-4 py-3 font-semibold text-[12px] text-navy-500">{c.razon_social}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.tipo==='JURIDICO'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-medium text-gray-700">{c.envios}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-navy-500">{formatMoney(c.montoTotal)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                          <div className="h-full bg-sky-brand rounded-full" style={{width:`${pct}%`}}/>
                        </div>
                        <span className="text-[11px] text-gray-500">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* MERCADERÍA */}
      {tab === 'mercaderia' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card padding={false} className="overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <p className="text-[13px] font-semibold text-gray-700">Por tipo de mercadería</p>
              <Button variant="ghost" size="xs" icon={<Download size={11}/>}
                onClick={()=>exportToCSV(data.porMercaderia,'mercaderia')}>CSV</Button>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {['Tipo','Cant.','Peso total','Monto'].map(h=>(
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.porMercaderia.map((m,i)=>(
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-[12px] font-medium text-gray-700">{m.tipo}</td>
                    <td className="px-3 py-2.5 text-[12px] text-gray-600">{m.cantidad}</td>
                    <td className="px-3 py-2.5 text-[12px] text-gray-600">{m.peso_total} kg</td>
                    <td className="px-3 py-2.5 text-[12px] font-semibold text-navy-500">{formatMoney(m.monto_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <p className="text-[13px] font-semibold text-gray-700 mb-4">Distribución por monto</p>
            <DonutChart
              data={data.porMercaderia.slice(0,5).map((m,i)=>({
                label: m.tipo, value: m.monto_total,
                color: ['#1c3a5c','#3b97c8','#22c55e','#f59e0b','#a855f7'][i]
              }))}
            />
            <div className="mt-4 pt-3 border-t">
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-500">Peso total registrado</span>
                <span className="font-bold text-navy-500">
                  {data.porMercaderia.reduce((s,m)=>s+m.peso_total,0)} kg
                </span>
              </div>
              <div className="flex justify-between text-[12px] mt-1">
                <span className="text-gray-500">Monto total</span>
                <span className="font-bold text-green-600">
                  {formatMoney(data.porMercaderia.reduce((s,m)=>s+m.monto_total,0))}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
