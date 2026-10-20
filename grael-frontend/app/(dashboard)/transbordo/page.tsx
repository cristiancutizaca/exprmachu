'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, CalendarDays, Download, Eye, MoreVertical, Plus, Search, Truck, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store'
import { transbordoApi, destinosApi } from '@/lib/api'
import { DESTINOS_LIST } from '@/lib/data'
import type { Destino, EstadoTransbordo } from '@/types'
import { Button, Card, EmptyState, FormField, Input, Modal, PageHeader, Select, StatusBadge } from '@/components/ui'

type UiEstado = 'ABIERTO' | 'EN_TRANSITO' | 'LLEGADO' | 'CERRADO'
type UiTransbordo = {
  id: string
  codigo: string
  fechaCreacion: string
  estado: UiEstado
  origen: string
  destino: string
  desembarqueEn?: string
  tickets: string[]
  remitente?: string
  destinatario?: string
  contenido?: string
  totalMonto: number
  totalBultos: number
  totalPeso: number
  conductor?: string
  placa?: string
  observacion?: string
}

const DEMO_ITEMS: UiTransbordo[] = [
  { id:'demo-1', codigo:'TRANS-2026-001', fechaCreacion:'2026-02-20 08:00', estado:'EN_TRANSITO', origen:'LIMA', destino:'CUSCO', tickets:['301-0631089'], remitente:'CILMEC S.A.C.', destinatario:'LUIS ENRIQUE PAZ', contenido:'Repuestos x 2', totalMonto:425, totalBultos:2, totalPeso:78, conductor:'Pedro Ramos', placa:'ABC-123' },
  { id:'demo-2', codigo:'TRANS-2026-002', fechaCreacion:'2026-02-18 10:30', estado:'LLEGADO', origen:'PIURA', destino:'CUSCO', tickets:['301-0631143'], remitente:'COMERCIAL ANDINA', destinatario:'MARÍA QUISPE', contenido:'Cajas x 4', totalMonto:182, totalBultos:4, totalPeso:34, conductor:'Carlos López', placa:'DEF-456' },
]

function mapApiItem(item: any): UiTransbordo {
  const tickets = item.tickets || []
  const first = tickets[0]
  return {
    id: item.id, codigo: item.codigo, fechaCreacion: item.createdAt || item.fechaCreacion || '',
    estado: item.estado, origen: item.origen?.nombre || '', destino: item.destino?.nombre || '',
    desembarqueEn: item.desembarqueEn?.nombre, tickets: tickets.map((t: any) => t.numeroTicket || t.id),
    remitente: first?.remitente?.razonSocial, destinatario: first?.destinatario?.razonSocial,
    contenido: first?.mercaderias?.map((m: any) => `${m.tipo} x${m.cantidad}`).join(', '),
    totalMonto: tickets.reduce((sum: number, t: any) => sum + Number(t.total || 0), 0),
    totalBultos: tickets.reduce((sum: number, t: any) => sum + (t.mercaderias || []).reduce((n: number, m: any) => n + Number(m.cantidad || 0), 0), 0),
    totalPeso: tickets.reduce((sum: number, t: any) => sum + (t.mercaderias || []).reduce((n: number, m: any) => n + Number(m.pesoTotal || 0), 0), 0),
  }
}

function ModalCrear({ destinos, sedeId, onCrear, onClose }: { destinos: Destino[]; sedeId?: string; onCrear: (payload: any) => Promise<void>; onClose: () => void }) {
  const [origenId, setOrigenId] = useState(destinos[0]?.id || '')
  const [destinoId, setDestinoId] = useState(destinos[1]?.id || destinos[0]?.id || '')
  const [desembarqueId, setDesembarqueId] = useState('')
  const [observacion, setObservacion] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    if (!origenId || !destinoId || origenId === destinoId) { toast.error('Seleccione origen y destino diferentes'); return }
    setLoading(true)
    if (!sedeId && !String(sedeId).startsWith('demo')) { toast.error('La sesión real no tiene sede operativa'); setLoading(false); return }
    try { await onCrear({ sedeId: sedeId || 'demo-sede', origenId, destinoId, desembarqueId: desembarqueId || undefined, motivo: observacion.trim() || 'Transbordo operativo' }); onClose() }
    finally { setLoading(false) }
  }
  return <Modal open title="Crear Transbordo" onClose={onClose} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button loading={loading} icon={<Plus size={13}/>} onClick={submit}>Crear Transbordo</Button></div>}>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField label="Origen"><Select value={origenId} onChange={e=>setOrigenId(e.target.value)}>{destinos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}</Select></FormField>
      <FormField label="Destino"><Select value={destinoId} onChange={e=>setDestinoId(e.target.value)}>{destinos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}</Select></FormField>
      <FormField label="Desembarque en"><Select value={desembarqueId} onChange={e=>setDesembarqueId(e.target.value)}><option value="">Seleccionar</option>{destinos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}</Select></FormField>
      <FormField label="Observación"><Input value={observacion} onChange={e=>setObservacion(e.target.value)} placeholder="Notas adicionales"/></FormField>
    </div>
  </Modal>
}

function Row({ item, onView, onAdvance }: { item: UiTransbordo; onView: () => void; onAdvance: () => void }) {
  const next: Record<UiEstado, UiEstado | undefined> = { ABIERTO:'EN_TRANSITO', EN_TRANSITO:'LLEGADO', LLEGADO:'CERRADO', CERRADO:undefined }
  return <tr className="border-b border-gray-100 hover:bg-gray-50/60">
    <td className="px-3 py-3 min-w-[135px]"><p className="text-[10px] text-gray-600">{item.fechaCreacion}</p><p className="text-[10px] text-gray-400">{item.codigo}</p></td>
    <td className="px-3 py-3"><StatusBadge estado={item.estado}/></td>
    <td className="px-3 py-3 min-w-[110px]"><p className="text-[11px] font-semibold text-navy-500">{item.tickets[0] || '—'}</p><p className="text-[10px] text-gray-500">{item.origen} → {item.destino}</p></td>
    <td className="px-3 py-3 min-w-[150px]"><p className="text-[11px] text-gray-700">{item.remitente || '—'}</p><p className="text-[10px] text-gray-400">{item.totalBultos} bultos · {item.totalPeso} kg</p></td>
    <td className="px-3 py-3 min-w-[150px]"><p className="text-[11px] text-gray-700">{item.destinatario || '—'}</p><p className="text-[10px] text-gray-400">{item.desembarqueEn || item.destino}</p></td>
    <td className="px-3 py-3 text-[11px] text-gray-500 min-w-[140px]">{item.contenido || '—'}</td>
    <td className="px-3 py-3 min-w-[90px]"><p className="text-[12px] font-bold text-navy-500">S/ {item.totalMonto.toFixed(2)}</p></td>
    <td className="px-3 py-3"><div className="flex items-center gap-1"><button aria-label="Ver detalle" onClick={onView} className="w-7 h-7 flex items-center justify-center rounded bg-sky-brand text-white"><Eye size={13}/></button>{next[item.estado] && <button aria-label="Cambiar estado" onClick={onAdvance} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-blue-50"><Truck size={13}/></button>}<button aria-label="Más acciones" onClick={onView} className="w-7 h-7 flex items-center justify-center rounded bg-sky-brand text-white"><MoreVertical size={13}/></button></div></td>
  </tr>
}

export default function TransbordoPage() {
  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  const isDemoMode = !token || token.startsWith('demo-')
  const [items, setItems] = useState<UiTransbordo[]>(DEMO_ITEMS)
  const [destinos, setDestinos] = useState<Destino[]>(DESTINOS_LIST)
  const [showCrear, setShowCrear] = useState(false)
  const [detalle, setDetalle] = useState<UiTransbordo | null>(null)
  const [loading, setLoading] = useState(false)
  const [fOrigen, setFOrigen] = useState('')
  const [fDestino, setFDestino] = useState('')
  const [fDesembarque, setFDesembarque] = useState('')
  const [fInicio, setFInicio] = useState('')
  const [fFin, setFFin] = useState('')

  const listar = useCallback(async () => {
    if (isDemoMode) return
    setLoading(true)
    try {
      const response = await transbordoApi.listar({ sedeId: user?.sedeId || undefined, origenId:fOrigen || undefined, destinoId:fDestino || undefined, desembarqueId:fDesembarque || undefined, fechaInicio:fInicio || undefined, fechaFin:fFin || undefined, page:1, limit:20 })
      setItems(response.data.data.map(mapApiItem))
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo listar transbordos') }
    finally { setLoading(false) }
  }, [isDemoMode, fOrigen, fDestino, fDesembarque, fInicio, fFin, user?.sedeId])
  useEffect(() => {
    if (isDemoMode) return
    destinosApi.listar().then(res=>setDestinos(res.data)).catch(()=>toast.error('No se pudo cargar destinos'))
    listar()
  }, [isDemoMode, listar])

  const filtered = useMemo(() => isDemoMode ? items.filter(item => (!fOrigen || item.origen === fOrigen) && (!fDestino || item.destino === fDestino) && (!fDesembarque || item.desembarqueEn === fDesembarque)) : items, [items, fOrigen, fDestino, fDesembarque, isDemoMode])

  const crear = async (payload: any) => {
    if (isDemoMode) {
      const origen = destinos.find(d=>d.id===payload.origenId)?.nombre || payload.origenId
      const destino = destinos.find(d=>d.id===payload.destinoId)?.nombre || payload.destinoId
      const item: UiTransbordo = { id:`demo-${Date.now()}`, codigo:`TRANS-DEMO-${Date.now().toString().slice(-4)}`, fechaCreacion:new Date().toLocaleString('es-PE'), estado:'ABIERTO', origen, destino, tickets:[], totalMonto:0, totalBultos:0, totalPeso:0, observacion:payload.observacion }
      setItems(prev=>[item, ...prev]); toast.success(`Transbordo ${item.codigo} creado`); return
    }
    const response = await transbordoApi.crear({ ...payload, sedeId: user?.sedeId, motivo: payload.motivo || 'Transbordo operativo' })
    setItems(prev=>[mapApiItem(response.data), ...prev]); toast.success(`Transbordo ${response.data.codigo} creado`)
  }

  const avanzar = async (item: UiTransbordo) => {
    const next: Record<UiEstado, UiEstado | undefined> = { ABIERTO:'EN_TRANSITO', EN_TRANSITO:'LLEGADO', LLEGADO:'CERRADO', CERRADO:undefined }
    const estado = next[item.estado]; if (!estado) return
    if (!isDemoMode) await transbordoApi.cambiarEstado(item.id, estado as any)
    setItems(prev=>prev.map(current=>current.id===item.id ? {...current, estado} : current)); toast.success(`${item.codigo} actualizado`)
  }

  const descargar = async () => {
    if (isDemoMode) {
      const csv = ['FECHA,ESTADO,TICKET,ORIGEN,DESTINO,TOTAL', ...filtered.map(i=>[i.fechaCreacion,i.estado,i.tickets[0]||'',i.origen,i.destino,i.totalMonto].join(','))].join('\n')
      const url = URL.createObjectURL(new Blob([csv], {type:'text/csv'})); const a=document.createElement('a'); a.href=url; a.download='manifiesto-demo.csv'; a.click(); URL.revokeObjectURL(url); return
    }
    if (!detalle) return toast('Abra el detalle de un transbordo para descargar su manifiesto')
    const response = await transbordoApi.descargarManifiesto(detalle.id); const url=URL.createObjectURL(response.data); const a=document.createElement('a'); a.href=url; a.download=`manifiesto-${detalle.codigo}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return <div className="pb-6">
    <PageHeader title="Lista de Transbordo" actions={<div className="flex gap-2"><Button variant="outline" size="sm" onClick={listar} loading={loading}>Listar</Button><Button variant="dark" size="sm" icon={<Plus size={13}/>} onClick={()=>setShowCrear(true)}>Crear Transbordo</Button><Button variant="primary" size="sm" icon={<Download size={13}/>} onClick={descargar}>Descargar Manifiesto</Button></div>} />
    <Card className="mb-4"><div className="flex flex-wrap gap-3 items-end"><FormField label="Origen" className="min-w-[170px] flex-1"><Select value={fOrigen} onChange={e=>setFOrigen(e.target.value)}><option value="">TODOS</option>{destinos.map(d=><option key={d.id} value={isDemoMode ? d.nombre : d.id}>{d.nombre}</option>)}</Select></FormField><FormField label="Destino" className="min-w-[170px] flex-1"><Select value={fDestino} onChange={e=>setFDestino(e.target.value)}><option value="">TODOS</option>{destinos.map(d=><option key={d.id} value={isDemoMode ? d.nombre : d.id}>{d.nombre}</option>)}</Select></FormField><FormField label="Desembarque en" className="min-w-[170px] flex-1"><Select value={fDesembarque} onChange={e=>setFDesembarque(e.target.value)}><option value="">TODOS</option>{destinos.map(d=><option key={d.id} value={isDemoMode ? d.nombre : d.id}>{d.nombre}</option>)}</Select></FormField><FormField label="Fecha Inicio" className="min-w-[140px]"><Input type="date" value={fInicio} onChange={e=>setFInicio(e.target.value)} suffix={<CalendarDays size={12}/>} /></FormField><FormField label="Fecha Fin" className="min-w-[140px]"><Input type="date" value={fFin} onChange={e=>setFFin(e.target.value)} suffix={<CalendarDays size={12}/>} /></FormField><Button variant="primary" size="md" icon={<Search size={13}/>} onClick={listar}>Buscar</Button></div></Card>
    <Card padding={false} className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr className="bg-[#f4f8fb] border-b border-gray-200">{['FECHA','ESTADO','TICKET','REMITENTE','DESTINATARIO','CONTENIDO','MONTO','MENÚ'].map(h=><th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{filtered.length===0 ? <tr><td colSpan={8}><EmptyState icon={<ArrowLeftRight size={28}/>} title="No se encontraron transbordos" subtitle="Ajuste los filtros o cree un transbordo nuevo" action={<Button variant="dark" size="sm" onClick={()=>setShowCrear(true)} icon={<Plus size={13}/>}>Crear Transbordo</Button>}/></td></tr> : filtered.map(item=><Row key={item.id} item={item} onView={()=>setDetalle(item)} onAdvance={()=>avanzar(item)}/>)}</tbody></table></div><div className="px-4 py-3 border-t border-gray-100 text-[11px] text-gray-500">{filtered.length} registro(s)</div></Card>
    {showCrear && <ModalCrear destinos={destinos} sedeId={user?.sedeId || (isDemoMode ? 'demo-sede' : undefined)} onCrear={crear} onClose={()=>setShowCrear(false)}/>} {detalle && <Modal open title={`Detalle — ${detalle.codigo}`} onClose={()=>setDetalle(null)} footer={<Button variant="ghost" className="w-full" onClick={()=>setDetalle(null)}>Cerrar</Button>}><div className="space-y-3 text-[12px]"><div className="flex justify-between"><StatusBadge estado={detalle.estado}/><span className="text-gray-400">{detalle.fechaCreacion}</span></div><div className="grid grid-cols-2 gap-2"><div className="bg-gray-50 p-2"><span className="text-[10px] text-gray-400">ORIGEN</span><p>{detalle.origen}</p></div><div className="bg-gray-50 p-2"><span className="text-[10px] text-gray-400">DESTINO</span><p>{detalle.destino}</p></div><div className="bg-gray-50 p-2"><span className="text-[10px] text-gray-400">TICKETS</span><p>{detalle.tickets.join(', ') || 'Sin tickets'}</p></div><div className="bg-gray-50 p-2"><span className="text-[10px] text-gray-400">TOTAL</span><p>S/ {detalle.totalMonto.toFixed(2)}</p></div></div><Button variant="primary" size="sm" icon={<Download size={13}/>} onClick={descargar}>Descargar manifiesto</Button></div></Modal>}
  </div>
}
