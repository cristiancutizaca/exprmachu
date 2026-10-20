'use client'
import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  ClipboardList, Plus, Search, ChevronRight, Truck,
  Package, Eye, Download, Printer, MapPin
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Button, Card, PageHeader, FormField, Input, Select,
  Modal, StatusBadge, EmptyState, Alert
} from '@/components/ui'
import { TICKETS_DB, DESTINOS_LIST } from '@/lib/data'
import { formatMoney } from '@/lib/utils'
import { useToggle } from '@/hooks'
import { manifiestoApi, destinosApi, catalogosV2Api } from '@/lib/api'
import { useAuthStore } from '@/store'
import type { Ticket } from '@/types'

type EstadoManiesto = 'ABIERTO'|'EN_RUTA'|'LLEGADO'|'CERRADO'
interface FlotaOption { id: string; placa?: string; nombres?: string; apellidos?: string; estado?: string }

interface Manifiesto {
  id: string; codigo: string; fecha: string; estado: EstadoManiesto
  origen: string; destino: string; programacion: string
  chofer: string; placa: string; totalBultos: number; totalPeso: number
  tickets: Ticket[]
}

const ticketsCUS = TICKETS_DB.filter(t => t.destino.nombre === 'CUSCO' && !t.anulado)

function formLabel(id: string, destinos: Array<{ id: string; nombre?: string; codigo?: string }>) {
  return destinos.find(item => item.id === id)?.nombre || destinos.find(item => item.id === id)?.codigo || id
}

const INIT: Manifiesto[] = [
  {
    id:'m1', codigo:'MAN-2026-0042', fecha:'2026-02-24', estado:'EN_RUTA',
    origen:'PIURA', destino:'CUSCO', programacion:'PIU-CUS-0600',
    chofer:'Roberto Aquino', placa:'V5K-349',
    totalBultos: ticketsCUS.reduce((s,t)=>s+t.mercaderias.reduce((ss,m)=>ss+m.cantidad,0),0),
    totalPeso:   ticketsCUS.reduce((s,t)=>s+t.mercaderias.reduce((ss,m)=>ss+m.pesoTotal,0),0),
    tickets:     ticketsCUS,
  },
  {
    id:'m2', codigo:'MAN-2026-0041', fecha:'2026-02-22', estado:'LLEGADO',
    origen:'LIMA', destino:'CUSCO', programacion:'LIM-CUS-0900',
    chofer:'Carlos Taipe', placa:'A3G-118',
    totalBultos:22, totalPeso:640,
    tickets: TICKETS_DB.filter(t=>t.origen.nombre==='LIMA'),
  },
  {
    id:'m3', codigo:'MAN-2026-0038', fecha:'2026-02-18', estado:'CERRADO',
    origen:'AREQUIPA', destino:'CUSCO', programacion:'AQP-CUS-0800',
    chofer:'Juan Paucar', placa:'Z9B-501',
    totalBultos:8, totalPeso:195,
    tickets: TICKETS_DB.filter(t=>t.origen.nombre==='AREQUIPA'),
  },
  {
    id:'m4', codigo:'MAN-2026-0043', fecha:'2026-02-24', estado:'ABIERTO',
    origen:'CUSCO', destino:'LIMA', programacion:'CUS-LIM-0800',
    chofer:'—', placa:'—',
    totalBultos:0, totalPeso:0,
    tickets: TICKETS_DB.filter(t=>t.destino.nombre==='LIMA'),
  },
]

const AVANZAR: Record<EstadoManiesto,{next?:EstadoManiesto;label?:string;color?:string}> = {
  ABIERTO:  { next:'EN_RUTA', label:'Despachar',      color:'bg-blue-600 text-white hover:bg-blue-700' },
  EN_RUTA:  { next:'LLEGADO', label:'Marcar llegado', color:'bg-green-600 text-white hover:bg-green-700' },
  LLEGADO:  { next:'CERRADO', label:'Cerrar',         color:'bg-gray-600 text-white hover:bg-gray-700' },
  CERRADO:  {},
}

// ─── Modal crear manifiesto ───────────────────────────────────────────────────
function ModalCrear({ onCrear, onClose, destinos, sedeOrigenId, vehiculos, conductores, isDemoMode }: { onCrear: (data: any) => Promise<void>; onClose: () => void; destinos: Array<{ id: string; nombre?: string; codigo?: string }>; sedeOrigenId?: string; vehiculos: FlotaOption[]; conductores: FlotaOption[]; isDemoMode: boolean }) {
  const [form, setForm] = useState({
    origen:'PIURA', destino:'CUSCO', programacion:'PIU-CUS-0600',
    chofer:'', placa:'', vehiculoId:'', conductorId:'', fecha: new Date().toISOString().split('T')[0]
  })
  const DESTS = ['CUSCO','LIMA','AREQUIPA','PIURA','PUNO','QUILLABANBA']
  const PROGS = [
    'PIU-CUS-0600','LIM-CUS-0900','AQP-CUS-0800','PUN-CUS-0700',
    'CUS-LIM-0800','CUS-AQP-1000','CUS-PIU-2200',
  ]
  const fallbackDestinos: Array<{ id: string; nombre?: string; codigo?: string }> = ['CUSCO','LIMA','AREQUIPA','PIURA','PUNO','QUILLABAMBA'].map(nombre => ({ id: nombre, nombre }))
  const destinationOptions: Array<{ id: string; nombre?: string; codigo?: string }> = destinos.length ? destinos : fallbackDestinos

  const handleCrear = async () => {
    if (!form.origen || !form.destino || form.origen === form.destino) { toast.error('Complete una ruta válida'); return }
    const origen = destinationOptions.find(item => (item.nombre || item.codigo || '').toUpperCase() === form.origen.toUpperCase())
    const destino = destinationOptions.find(item => (item.nombre || item.codigo || '').toUpperCase() === form.destino.toUpperCase())
    if (!origen?.id || !destino?.id) { toast.error('No se encontraron los destinos en el API'); return }
    if (!isDemoMode && (!form.vehiculoId || !form.conductorId)) { toast.error('Seleccione vehículo y conductor activos'); return }
    await onCrear({
      origenId: origen.id, destinoId: destino.id, sedeOrigenId, sedeDestinoId: sedeOrigenId, fechaViaje: form.fecha,
      vehiculoId: form.vehiculoId || undefined, conductorId: form.conductorId || undefined,
      chofer: isDemoMode ? (form.chofer || undefined) : undefined, placa: isDemoMode ? (form.placa || undefined) : undefined,
    })
    onClose()
  }

  return (
    <Modal open title="Nuevo Manifiesto" onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" className="flex-1" onClick={handleCrear} icon={<Plus size={13}/>}>
            Crear
          </Button>
        </div>
      }>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Fecha">
          <Input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))}/>
        </FormField>
        <FormField label="Programación">
          <Select value={form.programacion} onChange={e=>setForm(f=>({...f,programacion:e.target.value}))}>
            {PROGS.map(p=><option key={p}>{p}</option>)}
          </Select>
        </FormField>
        <FormField label="Origen">
          <Select value={form.origen} onChange={e=>setForm(f=>({...f,origen:e.target.value}))}>
            {destinationOptions.map(d=><option key={d.id}>{d.nombre || d.codigo}</option>)}
          </Select>
        </FormField>
        <FormField label="Destino">
          <Select value={form.destino} onChange={e=>setForm(f=>({...f,destino:e.target.value}))}>
            {destinationOptions.map(d=><option key={d.id}>{d.nombre || d.codigo}</option>)}
          </Select>
        </FormField>
        {isDemoMode ? <>
          <FormField label="Chofer">
            <Input value={form.chofer} onChange={e=>setForm(f=>({...f,chofer:e.target.value}))} placeholder="Nombre del chofer"/>
          </FormField>
          <FormField label="Placa">
            <Input value={form.placa} onChange={e=>setForm(f=>({...f,placa:e.target.value.toUpperCase()}))} placeholder="ABC-123"/>
          </FormField>
        </> : <>
          <FormField label="Vehículo">
            <Select value={form.vehiculoId} onChange={e=>setForm(f=>({...f,vehiculoId:e.target.value}))}>
              <option value="">Seleccione vehículo</option>
              {vehiculos.map(v => <option key={v.id} value={v.id}>{v.placa || v.id}</option>)}
            </Select>
          </FormField>
          <FormField label="Conductor">
            <Select value={form.conductorId} onChange={e=>setForm(f=>({...f,conductorId:e.target.value}))}>
              <option value="">Seleccione conductor</option>
              {conductores.map(c => <option key={c.id} value={c.id}>{`${c.nombres || ''} ${c.apellidos || ''}`.trim() || c.id}</option>)}
            </Select>
          </FormField>
        </>}
      </div>
    </Modal>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────
export default function ManifiestoPage() {
  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  const isDemoMode = !token || token.startsWith('demo-')
  const [items, setItems]         = useState<Manifiesto[]>(INIT)
  const [destinos, setDestinos]   = useState<Array<{ id: string; nombre?: string; codigo?: string }>>([])
  const [vehiculos, setVehiculos] = useState<FlotaOption[]>([])
  const [conductores, setConductores] = useState<FlotaOption[]>([])
  const [loading, setLoading]     = useState(false)
  const [expandido, setExpandido] = useState<string|null>(null)
  const [verDetalle, setVerDetalle] = useState<Manifiesto|null>(null)
  const [ticketIdInput, setTicketIdInput] = useState('')
  const [scanCode, setScanCode] = useState('')
  const [operacionLoading, setOperacionLoading] = useState(false)
  const [showCrear, setShowCrear] = useToggle()
  const [filtroEst, setFiltroEst] = useState('')
  const [filtroQ,   setFiltroQ]   = useState('')

  const cargarManifiestos = useCallback(async () => {
    if (isDemoMode) { setItems(INIT); return }
    setLoading(true)
    try {
      const response = await manifiestoApi.listar()
      const rows = response.data?.data || response.data || []
      setItems(rows.map((m: any) => {
        const tickets = (m.tickets || []).map((t: any) => ({ ...t, mercaderias: t.mercaderias || [], bultos: t.bultos || [] }))
        return {
          id: m.id, codigo: m.codigo, fecha: String(m.fechaViaje || m.createdAt || '').slice(0, 10), estado: m.estado,
          origen: m.origen?.nombre || m.origen?.codigo || '—', destino: m.destino?.nombre || m.destino?.codigo || '—',
          programacion: m.programacion?.codigo || '—', chofer: m.conductor ? `${m.conductor.nombres || ''} ${m.conductor.apellidos || ''}`.trim() : (m.chofer || '—'),
          placa: m.vehiculo?.placa || m.placa || '—', totalBultos: tickets.reduce((sum: number, t: any) => sum + (t.bultos?.length || t.mercaderias.reduce((s: number, x: any) => s + Number(x.cantidad || 0), 0)), 0),
          totalPeso: tickets.reduce((sum: number, t: any) => sum + t.mercaderias.reduce((s: number, x: any) => s + Number(x.pesoTotal || 0), 0), 0), tickets,
        }
      }))
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudieron cargar los manifiestos reales') }
    finally { setLoading(false) }
  }, [isDemoMode])

  useEffect(() => { cargarManifiestos() }, [cargarManifiestos])

  useEffect(() => {
    if (isDemoMode) return
    destinosApi.listar().then(response => setDestinos(response.data || [])).catch(() => toast.error('No se pudieron cargar los destinos reales'))
    Promise.all([catalogosV2Api.vehiculos({ estado: 'ACTIVO' }), catalogosV2Api.conductores({ estado: 'ACTIVO' })])
      .then(([vehicles, drivers]) => {
        setVehiculos(vehicles.data?.data || vehicles.data || [])
        setConductores(drivers.data?.data || drivers.data || [])
      })
      .catch(() => toast.error('No se pudo cargar la flota activa'))
  }, [isDemoMode])

  const filtrados = useMemo(() => {
    let list = items
    if (filtroEst) list = list.filter(m => m.estado === filtroEst)
    if (filtroQ)   list = list.filter(m =>
      m.codigo.includes(filtroQ) ||
      m.origen.toLowerCase().includes(filtroQ.toLowerCase()) ||
      m.destino.toLowerCase().includes(filtroQ.toLowerCase()) ||
      m.chofer.toLowerCase().includes(filtroQ.toLowerCase())
    )
    return list.sort((a,b) => b.fecha.localeCompare(a.fecha))
  }, [items, filtroEst, filtroQ])

  const avanzar = async (id: string) => {
    const current = items.find(item => item.id === id)
    if (!current) return
    const ac = AVANZAR[current.estado]
    if (!ac.next) return
    if (isDemoMode) {
      setItems(prev => prev.map(m => m.id === id ? { ...m, estado: ac.next! } : m))
      toast.success(`${current.codigo} → ${ac.next.replace('_',' ')}`)
      return
    }
    try {
      if (ac.next === 'EN_RUTA') await manifiestoApi.despachar(id)
      else if (ac.next === 'LLEGADO') await manifiestoApi.llegada(id)
      else await manifiestoApi.cambiarEstado(id, ac.next)
      await cargarManifiestos()
      toast.success(`${current.codigo} → ${ac.next.replace('_',' ')}`)
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo actualizar el manifiesto') }
  }

  const agregarTicketAlManifiesto = async () => {
    if (!verDetalle || !ticketIdInput.trim()) { toast.error('Ingrese el ID del ticket'); return }
    if (isDemoMode) { toast('Demo: agregar tickets se simula localmente'); setTicketIdInput(''); return }
    setOperacionLoading(true)
    try {
      await manifiestoApi.agregarTickets(verDetalle.id, [ticketIdInput.trim()])
      setTicketIdInput('')
      setVerDetalle(null)
      await cargarManifiestos()
      toast.success('Ticket agregado al manifiesto')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo agregar el ticket')
    } finally { setOperacionLoading(false) }
  }

  const escanearBulto = async () => {
    if (!verDetalle || !scanCode.trim()) { toast.error('Ingrese el código del bulto'); return }
    if (isDemoMode) { toast('Demo: el escaneo se simula sin persistencia'); setScanCode(''); return }
    setOperacionLoading(true)
    try {
      await manifiestoApi.cargarBulto(verDetalle.id, scanCode.trim())
      setScanCode('')
      setVerDetalle(null)
      await cargarManifiestos()
      toast.success('Bulto cargado correctamente')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo cargar el bulto')
    } finally { setOperacionLoading(false) }
  }

  const stats = [
    { label:'Abiertos',    v:items.filter(m=>m.estado==='ABIERTO').length,  color:'text-amber-600' },
    { label:'En ruta',     v:items.filter(m=>m.estado==='EN_RUTA').length,   color:'text-blue-600'  },
    { label:'Llegados',    v:items.filter(m=>m.estado==='LLEGADO').length,   color:'text-green-600' },
    { label:'Total tickets',v:items.reduce((s,m)=>s+m.tickets.length,0),    color:'text-navy-500'  },
  ]

  return (
    <div className="pb-6">
      <PageHeader
        title="Manifiestos"
        subtitle={isDemoMode ? 'Modo Demo — datos locales' : 'Sesión real — datos del API'}
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={setShowCrear.turnOn}>
            Nuevo Manifiesto
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {stats.map(({label,v,color})=>(
          <Card key={label}><p className="text-[11px] text-gray-400 mb-1">{label}</p><p className={`text-[22px] font-black ${color}`}>{v}</p></Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-2.5 items-end">
          <FormField label="Buscar" className="flex-1 min-w-[180px]">
            <Input value={filtroQ} onChange={e=>setFiltroQ(e.target.value)}
              placeholder="Código, ruta, chofer..." suffix={<Search size={12}/>}/>
          </FormField>
          <FormField label="Estado" className="w-[150px]">
            <Select value={filtroEst} onChange={e=>setFiltroEst(e.target.value)}>
              <option value="">Todos</option>
              <option value="ABIERTO">Abierto</option>
              <option value="EN_RUTA">En Ruta</option>
              <option value="LLEGADO">Llegado</option>
              <option value="CERRADO">Cerrado</option>
            </Select>
          </FormField>
          {(filtroEst||filtroQ) && (
            <Button variant="ghost" size="sm" onClick={()=>{setFiltroEst('');setFiltroQ('')}}>Limpiar</Button>
          )}
        </div>
      </Card>

      {/* Lista de manifiestos expandibles */}
      <div className="space-y-3">
        {filtrados.length === 0 && (
          <EmptyState icon={<ClipboardList size={28}/>} title="Sin manifiestos" subtitle="No hay manifiestos con este filtro"/>
        )}
        {filtrados.map(m => {
          const isOpen  = expandido === m.id
          const accion  = AVANZAR[m.estado]
          const subtotal = m.tickets.reduce((s,t)=>s+t.total,0)

          return (
            <Card key={m.id} padding={false} className="overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandido(isOpen ? null : m.id)}>
                <ChevronRight size={16} className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen?'rotate-90':''}`}/>

                <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-x-4 gap-y-0.5 items-center">
                  <div className="md:col-span-1">
                    <p className="text-[12px] font-bold text-navy-500">{m.codigo}</p>
                    <p className="text-[10px] text-gray-400">{m.fecha}</p>
                  </div>
                  <div className="md:col-span-1">
                    <StatusBadge estado={m.estado}/>
                  </div>
                  <div className="md:col-span-1">
                    <div className="flex items-center gap-1 text-[12px]">
                      <MapPin size={11} className="text-sky-brand flex-shrink-0"/>
                      <span className="font-medium text-sky-brand">{m.origen}</span>
                      <ChevronRight size={10} className="text-gray-300"/>
                      <span className="font-medium text-sky-brand">{m.destino}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">{m.programacion}</p>
                  </div>
                  <div className="hidden md:block text-center">
                    <p className="text-[13px] font-bold">{m.tickets.length}</p>
                    <p className="text-[9px] text-gray-400">tickets</p>
                  </div>
                  <div className="hidden md:block text-center">
                    <p className="text-[11px] text-gray-600">{m.totalBultos} bts</p>
                    <p className="text-[10px] text-gray-400">{m.totalPeso} kg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-bold text-navy-500">{subtotal > 0 ? formatMoney(subtotal) : '—'}</p>
                    <p className="text-[10px] text-gray-400">{m.chofer !== '—' ? m.chofer : 'Sin asignar'}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2" onClick={e=>e.stopPropagation()}>
                  {accion.next && (
                    <button onClick={() => avanzar(m.id)}
                      className={`px-2.5 py-1.5 text-[11px] rounded font-medium flex items-center gap-1 transition-colors ${accion.color}`}>
                      <Truck size={11}/>{accion.label}
                    </button>
                  )}
                  <button onClick={() => setVerDetalle(m)}
                    className="p-1.5 text-gray-400 hover:text-sky-brand hover:bg-blue-50 rounded transition-colors"
                    title="Ver detalle">
                    <Eye size={13}/>
                  </button>
                  <button onClick={() => toast(`Descargando ${m.codigo}...`)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                    <Download size={13}/>
                  </button>
                </div>
              </div>

              {/* Detalle expandido */}
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  {m.tickets.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      <Package size={22} className="mx-auto mb-2 text-gray-200"/>
                      <p className="text-[12px]">Sin tickets en este manifiesto</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
                        <p className="text-[11px] font-semibold text-gray-500">
                          {m.tickets.length} ticket(s) — Total: {formatMoney(subtotal)}
                        </p>
                        <button onClick={() => toast(`Imprimiendo manifiesto ${m.codigo}...`)}
                          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-navy-500 transition-colors">
                          <Printer size={12}/> Imprimir
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[11px]">
                          <thead>
                            <tr className="border-b border-gray-200">
                              {['Ticket','Estado','Remitente','Destinatario','Mercadería','Bultos','Peso','Monto','Pagado'].map(h=>(
                                <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {m.tickets.map(t => {
                              const bultos = t.mercaderias.reduce((s,m)=>s+m.cantidad,0)
                              const peso   = t.mercaderias.reduce((s,m)=>s+m.pesoTotal,0)
                              return (
                                <tr key={t.id} className="border-b border-gray-100 hover:bg-white transition-colors">
                                  <td className="px-3 py-2 font-semibold text-navy-500">{t.numeroTicket}</td>
                                  <td className="px-3 py-2"><StatusBadge estado={t.estado}/></td>
                                  <td className="px-3 py-2 text-gray-700 max-w-[120px] truncate">{t.remitente.razonSocial}</td>
                                  <td className="px-3 py-2 text-gray-700 max-w-[120px] truncate">{t.destinatario.razonSocial}</td>
                                  <td className="px-3 py-2 text-gray-600">{t.mercaderias.map(m=>m.tipo).join(', ')}</td>
                                  <td className="px-3 py-2 text-center">{bultos}</td>
                                  <td className="px-3 py-2">{peso}kg</td>
                                  <td className="px-3 py-2 font-semibold text-navy-500">{formatMoney(t.total)}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${t.pagado?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
                                      {t.pagado?'SÍ':'NO'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-navy-500/5 font-semibold text-[12px]">
                              <td colSpan={5} className="px-3 py-2 text-right text-gray-600">TOTALES:</td>
                              <td className="px-3 py-2 text-center">{m.tickets.reduce((s,t)=>s+t.mercaderias.reduce((ss,m)=>ss+m.cantidad,0),0)}</td>
                              <td className="px-3 py-2">{m.tickets.reduce((s,t)=>s+t.mercaderias.reduce((ss,m)=>ss+m.pesoTotal,0),0)}kg</td>
                              <td className="px-3 py-2 text-navy-500 font-black">{formatMoney(subtotal)}</td>
                              <td/>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {showCrear && (
        <ModalCrear
          destinos={destinos}
          vehiculos={vehiculos}
          conductores={conductores}
          isDemoMode={isDemoMode}
          sedeOrigenId={user?.sedeId || undefined}
          onCrear={async data => {
            if (isDemoMode) {
              const codigo = `MAN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
              setItems(prev => [{ id: Date.now().toString(), codigo, fecha: data.fechaViaje, estado: 'ABIERTO', origen: formLabel(data.origenId, destinos), destino: formLabel(data.destinoId, destinos), programacion: '—', chofer: data.chofer || '—', placa: data.placa || '—', totalBultos: 0, totalPeso: 0, tickets: [] }, ...prev])
              toast.success(`Manifiesto ${codigo} creado en Demo`)
              return
            }
            try {
              await manifiestoApi.crear(data)
              await cargarManifiestos()
              toast.success('Manifiesto creado correctamente')
            } catch (error: any) {
              toast.error(error.response?.data?.message || 'No se pudo crear el manifiesto')
              throw error
            }
          }}
          onClose={setShowCrear.turnOff}/>
      )}

      {/* Modal detalle */}
      {verDetalle && (
        <Modal open title={`Manifiesto ${verDetalle.codigo}`} onClose={() => setVerDetalle(null)}
          footer={
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" icon={<Printer size={13}/>}
                onClick={()=>toast('Imprimiendo...')}>Imprimir</Button>
              <Button variant="ghost" onClick={() => setVerDetalle(null)}>Cerrar</Button>
            </div>
          }>
          <div className="space-y-3 text-[12px]">
            <StatusBadge estado={verDetalle.estado}/>
            <div className="grid gap-2 rounded border border-blue-100 bg-blue-50/60 p-3">
              <p className="text-[11px] font-semibold text-navy-500">Gestión operativa</p>
              <div className="flex gap-2">
                <Input aria-label="ID del ticket a agregar" value={ticketIdInput} onChange={e => setTicketIdInput(e.target.value)} placeholder="ID UUID del ticket" />
                <Button size="sm" variant="primary" disabled={operacionLoading || verDetalle.estado !== 'ABIERTO'} onClick={agregarTicketAlManifiesto}>Agregar ticket</Button>
              </div>
              <div className="flex gap-2">
                <Input aria-label="Código de bulto a escanear" value={scanCode} onChange={e => setScanCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void escanearBulto() }} placeholder="Código de bulto; Enter para escanear" />
                <Button size="sm" variant="outline" disabled={operacionLoading || verDetalle.estado !== 'ABIERTO'} onClick={escanearBulto}>Escanear</Button>
              </div>
              <p className="text-[10px] text-gray-500">{isDemoMode ? 'Modo Demo: las acciones no persisten.' : 'Sesión real: las acciones se validan y persisten en PostgreSQL.'}</p>
            </div>
            {[
              {l:'Código',       v:verDetalle.codigo},
              {l:'Fecha',        v:verDetalle.fecha},
              {l:'Ruta',         v:`${verDetalle.origen} → ${verDetalle.destino}`},
              {l:'Programación', v:verDetalle.programacion},
              {l:'Chofer',       v:verDetalle.chofer},
              {l:'Placa',        v:verDetalle.placa},
              {l:'Tickets',      v:verDetalle.tickets.length},
              {l:'Total bultos', v:verDetalle.totalBultos},
              {l:'Peso total',   v:`${verDetalle.totalPeso} kg`},
              {l:'Monto total',  v:formatMoney(verDetalle.tickets.reduce((s,t)=>s+t.total,0))},
            ].map(({l,v})=>(
              <div key={l} className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">{l}</span>
                <span className="font-semibold text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
