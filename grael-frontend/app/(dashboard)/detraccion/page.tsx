'use client'
import { useEffect, useState } from 'react'
import {
  StickyNote, Search, Download, CheckCircle, AlertCircle,
  FileText,   Info

} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, PageHeader, FormField, Input, Select } from '@/components/ui'
import { TICKETS_DB } from '@/lib/data'
import { formatMoney, exportToCSV } from '@/lib/utils'
import { useAuthStore } from '@/store'

// En Perú la detracción al transporte de bienes es 4% cuando el monto es >= S/ 400
const PORCENTAJE_DETRACCION = 0.04
const MONTO_MINIMO          = 400

interface Detraccion {
  id:         string
  ticket:     string
  cliente:    string
  ruc:        string
  monto:      number
  detraccion: number
  fecha:      string
  estado:     'PENDIENTE' | 'DECLARADA' | 'PAGADA'
  nroDeposito?: string
}

// Construir detracciones de los tickets que aplican
const buildDetracciones = (): Detraccion[] =>
  TICKETS_DB
    .filter(t => !t.anulado && t.total >= MONTO_MINIMO && t.remitente.tipo === 'JURIDICO')
    .map((t, i) => ({
      id:         `det-${i}`,
      ticket:     t.numeroTicket,
      cliente:    t.remitente.razonSocial,
      ruc:        t.remitente.ruc || '—',
      monto:      t.total,
      detraccion: parseFloat((t.total * PORCENTAJE_DETRACCION).toFixed(2)),
      fecha:      t.fechaEmision,
      estado:     i === 1 ? 'DECLARADA' : i === 2 ? 'PAGADA' : 'PENDIENTE',
      nroDeposito: i === 2 ? `DEP-${Date.now().toString().slice(-8)}` : undefined,
    }))

const ESTADO_STYLE = {
  PENDIENTE: { bg:'bg-amber-100', text:'text-amber-700'  },
  DECLARADA: { bg:'bg-blue-100',  text:'text-blue-700'   },
  PAGADA:    { bg:'bg-green-100', text:'text-green-700'  },
}

export default function DetraccionPage() {
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [items, setItems] = useState<Detraccion[]>([])

  useEffect(() => {
    setItems(isDemoMode ? buildDetracciones() : [])
  }, [isDemoMode])
  const [filtro, setFiltro] = useState('')
  const [filtroEst, setFiltroEst] = useState('')

  const filtrados = items.filter(d =>
    (!filtro    || d.ticket.includes(filtro) || d.cliente.toLowerCase().includes(filtro.toLowerCase()) || d.ruc.includes(filtro)) &&
    (!filtroEst || d.estado === filtroEst)
  )

  const totalDetracciones = filtrados.reduce((s, d) => s + d.detraccion, 0)
  const pendientes   = items.filter(d => d.estado === 'PENDIENTE').length
  const totalPendMonto = items.filter(d=>d.estado==='PENDIENTE').reduce((s,d)=>s+d.detraccion,0)

  const declarar = (id: string) => {
    if (!isDemoMode) { toast.error('Detracción real aún no está integrada; no se envió ninguna declaración') ; return }
    setItems(prev => prev.map(d => d.id === id ? { ...d, estado: 'DECLARADA' } : d))
    toast.success('Demo: detracción marcada como registrada localmente')
  }

  const pagar = (id: string) => {
    if (!isDemoMode) { toast.error('Detracción real aún no está integrada; no se registró ningún pago') ; return }
    const nro = `DEP-DEMO-${Date.now().toString().slice(-8)}`
    setItems(prev => prev.map(d => d.id === id ? { ...d, estado: 'PAGADA', nroDeposito: nro } : d))
    toast.success(`Demo: pago local registrado — N° ${nro}`)
  }

  return (
    <div className="pb-6">
      <PageHeader
        title="Detracción"
        subtitle={isDemoMode ? 'Modo Demo — cálculo local sin declaración SUNAT' : 'Sesión real — integración local pendiente; no se simula SUNAT'}
        actions={
          <Button variant="outline" size="sm" icon={<Download size={13}/>}
            disabled={!isDemoMode || filtrados.length === 0}
            onClick={() => {
              exportToCSV(filtrados.map(d=>({ Ticket:d.ticket, Cliente:d.cliente, RUC:d.ruc, Monto:d.monto, Detraccion:d.detraccion, Estado:d.estado, Fecha:d.fecha })), 'detracciones-demo')
              toast.success('CSV Demo exportado')
            }}>
            Exportar CSV Demo
          </Button>
        }
      />

      {/* Banner informativo */}
      <Card className="mb-4 border-l-4 border-l-amber-500 bg-amber-50/50">
        <div className="flex items-start gap-3">
          <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="text-[12px] font-semibold text-amber-800">
              Régimen de Detracciones — Transporte de Bienes (D.Leg. 940)
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              {isDemoMode ? <>Demo: cálculo referencial del <strong>4%</strong> cuando el monto es <strong>≥ S/ 400.00</strong>. No se realiza declaración externa.</> : <>La integración de detracción real aún está pendiente. No se presenta estado como declarado en SUNAT.</>}
            </p>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label:'Total sujetos',   v:items.length,                       c:'text-navy-500'  },
          { label:'Pendientes',      v:pendientes,                          c:'text-amber-600' },
          { label:'Monto pendiente', v:formatMoney(totalPendMonto),         c:'text-amber-600' },
          { label:'Total detracciones', v:formatMoney(items.reduce((s,d)=>s+d.detraccion,0)), c:'text-green-600' },
        ].map(({label,v,c})=>(
          <Card key={label}><p className="text-[11px] text-gray-400 mb-1">{label}</p><p className={`text-[18px] font-black ${c}`}>{v}</p></Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-2.5 items-end">
          <FormField label="Buscar" className="flex-1 min-w-[200px]">
            <Input value={filtro} onChange={e=>setFiltro(e.target.value)}
              placeholder="Ticket, cliente, RUC..."/>
          </FormField>
          <FormField label="Estado" className="w-[150px]">
            <Select value={filtroEst} onChange={e=>setFiltroEst(e.target.value)}>
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="DECLARADA">Declarada</option>
              <option value="PAGADA">Pagada</option>
            </Select>
          </FormField>
          <FormField label="Período" className="w-[140px]">
            <Select><option>Febrero 2026</option><option>Enero 2026</option></Select>
          </FormField>
          <Button variant="primary" icon={<Search size={13}/>}>Buscar</Button>
        </div>
      </Card>

      {/* Tabla */}
      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                {['N° Ticket','Cliente','RUC','Fecha','Monto Oper.','Detrac. (4%)','Estado','Acción'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">
                  <StickyNote size={28} className="mx-auto mb-2 text-gray-200"/>
                  <p className="text-[12px]">No hay detracciones en este período</p>
                </td></tr>
              ) : filtrados.map(d => {
                const est = ESTADO_STYLE[d.estado]
                return (
                  <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 font-semibold text-[12px] text-navy-500">{d.ticket}</td>
                    <td className="px-3 py-3 text-[12px] text-gray-700">{d.cliente}</td>
                    <td className="px-3 py-3 text-[11px] font-mono text-gray-600">{d.ruc}</td>
                    <td className="px-3 py-3 text-[11px] text-gray-500 whitespace-nowrap">{d.fecha.split(' ')[0]}</td>
                    <td className="px-3 py-3 font-semibold text-[12px] text-gray-800">{formatMoney(d.monto)}</td>
                    <td className="px-3 py-3 font-bold text-[13px] text-red-600">{formatMoney(d.detraccion)}</td>
                    <td className="px-3 py-3">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${est.bg} ${est.text}`}>
                          {d.estado}
                        </span>
                        {d.nroDeposito && (
                          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{d.nroDeposito}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        {d.estado === 'PENDIENTE' && (
                          <button onClick={() => declarar(d.id)}
                            className="px-2.5 py-1.5 bg-blue-600 text-white text-[11px] rounded hover:bg-blue-700 flex items-center gap-1">
                            <FileText size={11}/> Declarar
                          </button>
                        )}
                        {d.estado === 'DECLARADA' && (
                          <button onClick={() => pagar(d.id)}
                            className="px-2.5 py-1.5 bg-green-600 text-white text-[11px] rounded hover:bg-green-700 flex items-center gap-1">
                            <CheckCircle size={11}/> Pagar
                          </button>
                        )}
                        {d.estado === 'PAGADA' && (
                          <span className="text-[11px] text-green-600 flex items-center gap-1">
                            <CheckCircle size={12}/> Pagado
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {filtrados.length > 0 && (
              <tfoot>
                <tr className="bg-navy-500 text-white">
                  <td colSpan={4} className="px-3 py-3 text-right text-[12px] font-semibold">
                    TOTALES ({filtrados.length}):
                  </td>
                  <td className="px-3 py-3 font-semibold text-[12px]">
                    {formatMoney(filtrados.reduce((s,d)=>s+d.monto,0))}
                  </td>
                  <td className="px-3 py-3 font-black text-[14px]">
                    {formatMoney(totalDetracciones)}
                  </td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  )
}
