'use client'
import { useState } from 'react'
import {
  Search, Plus, Download, Eye, AlignJustify, X,
  Printer, QrCode, Banknote, Trash2,
  ChevronLeft, ChevronRight, CheckCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button, Badge, Card, PageHeader, FormField, Input, Select } from '@/components/ui'
import { TICKETS_DB } from '@/lib/data'
import { useAuthStore } from '@/store'
import { ticketsApi } from '@/lib/api'
import type { Ticket, EstadoTicket, FiltrosBusqueda } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ESTADOS_MAP: Record<EstadoTicket, { label:string; variant:any }> = {
  PENDIENTE:              { label:'Pendiente',             variant:'pendiente' },
  EN_TRANSITO:            { label:'En Tránsito',           variant:'transito' },
  DESEMBARQUE_EN_DESTINO: { label:'Desembarque en Destino',variant:'desembarque' },
  ENTREGADO:              { label:'Entregado',             variant:'entregado' },
  ANULADO:                { label:'Anulado',               variant:'anulado' },
}

// ─── Modal detalle de ticket ──────────────────────────────────────────────────
type TicketAction = 'pagar' | 'anular' | 'imprimir' | 'qr' | 'entregar'

function ModalDetalle({ ticket, onClose, onAction }: { ticket: Ticket; onClose: () => void; onAction: (action: TicketAction) => void }) {
  const est = ESTADOS_MAP[ticket.estado]
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-navy-500 rounded-t-xl">
          <div>
            <p className="text-white font-bold text-[16px]">{ticket.numeroTicket}</p>
            <p className="text-white/60 text-[11px]">{ticket.fechaEmision}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge label={est.label} variant={est.variant}/>
            <button onClick={onClose} className="text-white/70 hover:text-white ml-2"><X size={18}/></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Ruta */}
          <div className="flex items-center justify-center gap-4 bg-blue-50 rounded-lg p-3">
            <div className="text-center">
              <p className="text-[10px] text-gray-400">ORIGEN</p>
              <p className="text-[15px] font-bold text-navy-500">{ticket.origen.nombre}</p>
            </div>
            <div className="text-gray-300 font-bold">→</div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">DESTINO</p>
              <p className="text-[15px] font-bold text-navy-500">{ticket.destino.nombre}</p>
            </div>
            <div className="ml-4 text-center">
              <p className="text-[10px] text-gray-400">TIPO ENTREGA</p>
              <Badge label={ticket.tipoEntrega} variant={ticket.tipoEntrega==='AGENCIA'?'agencia':'reparto'}/>
            </div>
          </div>

          {/* Personas */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Remitente', data:ticket.remitente },
              { label:'Destinatario', data:ticket.destinatario },
            ].map(({ label, data })=>(
              <div key={label} className="border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                <p className="text-[12px] font-semibold text-gray-800">{data.razonSocial}</p>
                <p className="text-[11px] text-gray-500">
                  {data.tipo === 'JURIDICO' ? `RUC: ${data.ruc}` : `DNI: ${data.dni}`}
                </p>
                {data.telefono && <p className="text-[11px] text-sky-brand">{data.telefono}</p>}
              </div>
            ))}
          </div>

          {/* Guías */}
          {ticket.guiasRemision.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Guías de Remisión</p>
              <div className="flex flex-wrap gap-1.5">
                {ticket.guiasRemision.map((g,i)=>(
                  <span key={i} className="bg-blue-50 text-navy-500 px-2.5 py-1 rounded text-[11px] font-medium">
                    {g.codigo}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mercadería */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Mercadería</p>
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {['Tipo','Descripción','Peso','Cant.','Sub Total','IGV','Total'].map(h=>(
                    <th key={h} className="px-2.5 py-1.5 text-left text-[10px] font-semibold text-gray-500 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ticket.mercaderias.map((m,i)=>(
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-2.5 py-1.5 font-medium">{m.tipo}</td>
                    <td className="px-2.5 py-1.5 text-gray-600">{m.descripcion||'—'}</td>
                    <td className="px-2.5 py-1.5">{m.pesoTotal}kg</td>
                    <td className="px-2.5 py-1.5">{m.cantidad}</td>
                    <td className="px-2.5 py-1.5">S/{m.subTotal.toFixed(2)}</td>
                    <td className="px-2.5 py-1.5">S/{m.igv.toFixed(2)}</td>
                    <td className="px-2.5 py-1.5 font-semibold text-navy-500">S/{m.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales + pago */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div>
              <p className="text-[11px] text-gray-500">Sub Total: <span className="font-medium">S/ {ticket.subTotal.toFixed(2)}</span></p>
              <p className="text-[11px] text-gray-500">IGV (18%): <span className="font-medium">S/ {ticket.igv.toFixed(2)}</span></p>
              <p className="text-[14px] font-bold text-navy-500">TOTAL: S/ {ticket.total.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <Badge
                label={ticket.pagado?'PAGADO':'NO PAGADO'}
                variant={ticket.pagado?'pagado':'nopagado'}
                className="text-[12px] px-3 py-1"
              />
              {ticket.fechaPago && (
                <p className="text-[10px] text-gray-400 mt-1">{ticket.fechaPago}</p>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="p-4 border-t flex gap-2 flex-wrap">
          <Button variant="primary" size="sm" icon={<Printer size={13}/>}
            onClick={()=>onAction('imprimir')}>Imprimir ticket</Button>
          <Button variant="outline" size="sm" icon={<QrCode size={13}/>}
            onClick={()=>onAction('qr')}>Ver QR</Button>
          {!ticket.pagado && (
            <Button variant="success" size="sm" icon={<Banknote size={13}/>}
              onClick={()=>onAction('pagar')}>Registrar pago</Button>
          )}
          {ticket.estado !== 'ENTREGADO' && ticket.estado !== 'ANULADO' && (
            <Button variant="dark" size="sm" icon={<CheckCircle size={13}/>}
              onClick={()=>onAction('entregar')}>Marcar entregado</Button>
          )}
          {!ticket.anulado && <Button variant="danger" size="sm" onClick={()=>onAction('anular')}>Anular</Button>}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Dropdown menu por fila ───────────────────────────────────────────────────
function TicketMenu({ ticket, onVer, onClose, onAction }: {
  ticket: Ticket; onVer: ()=>void; onClose: ()=>void; onAction: (action: TicketAction) => void
}) {
  const items = [
    { icon:<Eye size={13}/>,         label:'Ver detalle',      onClick: onVer },
    { icon:<Printer size={13}/>,     label:'Imprimir ticket',  onClick: ()=>onAction('imprimir') },
    { icon:<QrCode size={13}/>,      label:'Ver QR',           onClick: ()=>onAction('qr') },
    { icon:<Banknote size={13}/>,    label:'Registrar pago',   onClick: ()=>onAction('pagar'), hidden:ticket.pagado },
    { icon:<CheckCircle size={13}/>, label:'Marcar entregado', onClick: ()=>onAction('entregar'), hidden:ticket.estado==='ENTREGADO' },
    { icon:<Trash2 size={13}/>,      label:'Anular',           onClick: ()=>onAction('anular'), danger:true, hidden:ticket.anulado },
  ]
  return (
    <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg
                    shadow-lg min-w-[190px] py-1" onClick={e=>e.stopPropagation()}>
      {items.filter(a=>!a.hidden).map((a,i)=>(
        <button key={i} onClick={()=>{ a.onClick(); onClose() }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left transition-colors
            ${a.danger?'text-red-600 hover:bg-red-50':'text-gray-600 hover:bg-blue-50 hover:text-navy-500'}`}>
          <span className={a.danger?'text-red-400':'text-gray-400'}>{a.icon}</span>
          {a.label}
        </button>
      ))}
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────
function TicketRow({ ticket, selected, onSelect, onDetalle, onAction }: {
  ticket:Ticket; selected:boolean; onSelect:()=>void; onDetalle:()=>void; onAction: (action: TicketAction) => void
}) {
  const [menu, setMenu] = useState(false)
  const est = ESTADOS_MAP[ticket.estado]

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-3">
        <input type="checkbox" checked={selected} onChange={onSelect}
          className="accent-sky-brand w-3.5 h-3.5 cursor-pointer"/>
      </td>
      <td className="px-3 py-3 min-w-[155px]">
        <p className="text-[11px] font-medium text-gray-700">FE: {ticket.fechaEmision}</p>
        <p className="text-[10px] text-gray-400">USUARIO: {ticket.usuarioCreacion}</p>
      </td>
      <td className="px-3 py-3 min-w-[170px]">
        <Badge label={est.label} variant={est.variant} className="mb-1.5"/>
        <p className="text-[11px] text-gray-600 font-medium">{ticket.destinatario.razonSocial}</p>
      </td>
      <td className="px-3 py-3 min-w-[160px]">
        <Badge label={ticket.tipoEntrega} variant={ticket.tipoEntrega==='AGENCIA'?'agencia':'reparto'} className="mb-1.5"/>
        <p className="text-[11px] font-semibold text-navy-500">NT: {ticket.numeroTicket}</p>
        <p className="text-[10px] text-gray-500">ORIGEN: <span className="text-sky-brand font-medium">{ticket.origen.nombre}</span></p>
        <p className="text-[10px] text-gray-500">DESTINO: <span className="text-sky-brand font-medium">{ticket.destino.nombre}</span></p>
      </td>
      <td className="px-3 py-3 min-w-[170px]">
        <p className="text-[11px] font-medium text-gray-700">
          {ticket.remitente.tipo==='JURIDICO'?'🏢':'👤'} {ticket.remitente.razonSocial}
        </p>
        <p className="text-[10px] text-gray-400">{ticket.remitente.ruc||ticket.remitente.dni}</p>
        <p className="text-[11px] text-sky-brand">{ticket.remitente.telefono}</p>
      </td>
      <td className="px-3 py-3 min-w-[170px]">
        <p className="text-[11px] font-medium text-gray-700">
          👤 {ticket.destinatario.razonSocial}
        </p>
        <p className="text-[10px] text-gray-400">{ticket.destinatario.ruc||ticket.destinatario.dni}</p>
        <p className="text-[11px] text-sky-brand">{ticket.destinatario.telefono}</p>
      </td>
      <td className="px-3 py-3 text-[11px] text-gray-500 min-w-[120px]">
        {ticket.mercaderias.length>0
          ? ticket.mercaderias.map(m=>`${m.tipo} x${m.cantidad}`).join(', ')
          : '—'}
      </td>
      <td className="px-3 py-3 min-w-[100px]">
        <p className="text-[13px] font-bold text-gray-800">S/ {ticket.total.toFixed(2)}</p>
        <Badge label={ticket.pagado?'PAGADO':'NO PAGADO'} variant={ticket.pagado?'pagado':'nopagado'} className="mt-1"/>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <button onClick={onDetalle}
            className="w-7 h-7 bg-sky-brand text-white rounded flex items-center justify-center
                       hover:bg-sky-dark transition-colors" title="Ver detalle">
            <Eye size={13}/>
          </button>
          <div className="relative">
            <button onClick={()=>setMenu(!menu)}
              className="w-7 h-7 bg-sky-brand text-white rounded flex items-center justify-center
                         hover:bg-sky-dark transition-colors">
              <AlignJustify size={13}/>
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-40" onClick={()=>setMenu(false)}/>
                <TicketMenu ticket={ticket} onVer={()=>{onDetalle();setMenu(false)}} onAction={onAction} onClose={()=>setMenu(false)}/>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function BusquedaPage() {
  const router = useRouter()
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [tickets, setTickets] = useState<Ticket[]>(TICKETS_DB)
  const [totalTickets, setTotalTickets] = useState(TICKETS_DB.length)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detalleTicket, setDetalle] = useState<Ticket|null>(null)

  // Filtros
  const [fNumero,    setFNumero]    = useState('')
  const [fDniRuc,    setFDniRuc]    = useState('')
  const [fEstado,    setFEstado]    = useState('')
  const [fAnulado,   setFAnulado]   = useState('')
  const [fTipoCliente, setFTipoCliente] = useState('')
  const [fFiltrarPor, setFFiltrarPor] = useState('')
  const [fPagado,    setFPagado]    = useState('')
  const [fEntrega,   setFEntrega]   = useState('')
  const [fFechaIni,  setFechaIni]   = useState('2026-02-01')
    const [fFechaFin,  setFechaFin]  = useState('2026-02-28')
  const [fGuia, setFGuia] = useState('')
  const [fOrigen, setFOrigen] = useState('')
  const [fDestino, setFDestino] = useState('')

  const buscar = async () => {
    if (!isDemoMode) {
      setLoading(true)
      try {
        const filtros: FiltrosBusqueda = {
          numeroTicket: fNumero || undefined,
          dniRuc: fDniRuc || undefined,
          origenId: fOrigen || undefined,
          destinoId: fDestino || undefined,
          estado: (fEstado || '') as FiltrosBusqueda['estado'],
          anulado: fAnulado === 'SI' ? true : fAnulado === 'NO' ? false : null,
          tipoCliente: (fTipoCliente || 'TODOS') as FiltrosBusqueda['tipoCliente'],
          filtrarPor: (fFiltrarPor || '') as FiltrosBusqueda['filtrarPor'],
          pagado: fPagado === 'PAGADO' ? true : fPagado === 'NO_PAGADO' ? false : null,
          tipoEntrega: (fEntrega || '') as FiltrosBusqueda['tipoEntrega'],
          fechaInicio: fFechaIni || undefined,
          fechaFin: fFechaFin || undefined,
          guiaRemisionRemitente: fGuia || undefined,
        }
        const response = await ticketsApi.buscar(filtros, 1, 20)
        setTickets(response.data.data)
        setTotalTickets(response.data.total)
        toast(`${response.data.data.length} resultado(s) encontrado(s)`)
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'No se pudo buscar tickets')
      } finally { setLoading(false) }
      return
    }
    let data = [...TICKETS_DB]
    if (fNumero)  data = data.filter(t=>t.numeroTicket.includes(fNumero))
    if (fDniRuc)  data = data.filter(t=>
      (t.remitente.ruc||'').includes(fDniRuc)||(t.remitente.dni||'').includes(fDniRuc)||
      (t.destinatario.ruc||'').includes(fDniRuc)||(t.destinatario.dni||'').includes(fDniRuc))
    if (fEstado) data = data.filter(t=>t.estado===fEstado)
    if (fAnulado==='SI') data = data.filter(t=>t.anulado)
    if (fAnulado==='NO') data = data.filter(t=>!t.anulado)
    if (fTipoCliente==='NATURAL') data = data.filter(t=>t.remitente.tipo==='NATURAL' || t.destinatario.tipo==='NATURAL')
    if (fTipoCliente==='JURIDICO') data = data.filter(t=>t.remitente.tipo==='JURIDICO' || t.destinatario.tipo==='JURIDICO')
    if (fPagado==='PAGADO')   data = data.filter(t=>t.pagado)
    if (fPagado==='NO_PAGADO')data = data.filter(t=>!t.pagado)
    if (fEntrega) data = data.filter(t=>t.tipoEntrega===fEntrega)
    if (fGuia) data = data.filter(t=>t.guiasRemision.some(g=>g.codigo.includes(fGuia)))
    setTickets(data)
    setTotalTickets(data.length)
    toast(`${data.length} resultado(s) encontrado(s)`)
  }

  const descargarOS = async () => {
    if (isDemoMode) {
      const csv = ['TICKET,ESTADO,ORIGEN,DESTINO,TOTAL', ...tickets.map(t=>[t.numeroTicket,t.estado,t.origen.nombre,t.destino.nombre,t.total].join(','))].join('\\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a'); a.href = url; a.download = 'grael-os-demo.csv'; a.click(); URL.revokeObjectURL(url)
      return
    }
    try {
      const response = await ticketsApi.descargarOS({ numeroTicket:fNumero || undefined, dniRuc:fDniRuc || undefined, estado:(fEstado || '') as any, anulado:fAnulado === 'SI' ? true : fAnulado === 'NO' ? false : null, tipoCliente:(fTipoCliente || 'TODOS') as any, filtrarPor:(fFiltrarPor || '') as any, pagado:fPagado === 'PAGADO' ? true : fPagado === 'NO_PAGADO' ? false : null, tipoEntrega:(fEntrega || '') as any, fechaInicio:fFechaIni, fechaFin:fFechaFin, guiaRemisionRemitente:fGuia || undefined })
      const url = URL.createObjectURL(response.data); const a = document.createElement('a'); a.href = url; a.download = 'grael-os.csv'; a.click(); URL.revokeObjectURL(url)
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo descargar OS') }
  }

  const runTicketAction = async (ticket: Ticket, action: TicketAction) => {
    if (action === 'anular' && !window.confirm(`¿Anular el ticket ${ticket.numeroTicket}?`)) return
    try {
      if (isDemoMode) {
        if (action === 'pagar') setTickets(prev=>prev.map(t=>t.id===ticket.id ? {...t, pagado:true} : t))
        if (action === 'entregar') setTickets(prev=>prev.map(t=>t.id===ticket.id ? {...t, estado:'ENTREGADO'} : t))
        if (action === 'anular') setTickets(prev=>prev.map(t=>t.id===ticket.id ? {...t, estado:'ANULADO', anulado:true} : t))
        toast.success(`Acción demo aplicada: ${action}`)
        return
      }
      if (action === 'pagar') {
        const response = await ticketsApi.registrarPago(ticket.id)
        setTickets(prev=>prev.map(t=>t.id===ticket.id ? response.data : t))
      } else if (action === 'entregar') {
        const response = await ticketsApi.actualizar(ticket.id, { estado:'ENTREGADO' } as Partial<Ticket>)
        setTickets(prev=>prev.map(t=>t.id===ticket.id ? response.data : t))
      } else if (action === 'anular') {
        const response = await ticketsApi.anular(ticket.id, 'Anulación solicitada desde Búsqueda de Ticket')
        setTickets(prev=>prev.map(t=>t.id===ticket.id ? {...t, ...response.data} : t))
      } else if (action === 'qr') {
        const response = await ticketsApi.getQR(ticket.id)
        window.open(response.data.qrUrl, '_blank', 'noopener,noreferrer')
        return
      } else if (action === 'imprimir') {
        const response = await ticketsApi.imprimirTicket(ticket.id)
        const url = URL.createObjectURL(response.data); window.open(url, '_blank', 'noopener,noreferrer')
        return
      }
      toast.success('Ticket actualizado')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo completar la acción')
    }
  }

  const toggleSelect = (id:string) => setSelected(prev=>{
    const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n
  })
  const toggleAll = () => setSelected(prev=>prev.size===tickets.length?new Set():new Set(tickets.map(t=>t.id)))

  return (
    <div className="pb-6">
      <PageHeader
        title="Búsqueda de Ticket"
        actions={
          <>
            <Button variant="primary" size="sm" icon={<Plus size={13}/>} onClick={()=>router.push('/recepcion')}>
              Nueva Recepción
            </Button>
            <Button variant="secondary" size="sm" icon={<Download size={13}/>} onClick={descargarOS}>
              Descargar OS
            </Button>
          </>
        }
      />

      {/* FILTROS */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-2.5 mb-3">
          <FormField label="N° de Ticket" className="w-[120px]">
            <Input value={fNumero} onChange={e=>setFNumero(e.target.value)} placeholder="631143"/>
          </FormField>
          <FormField label="DNI o RUC" className="w-[140px]">
            <Input value={fDniRuc} onChange={e=>setFDniRuc(e.target.value)} placeholder="DNI o RUC"/>
          </FormField>
          <FormField label="Origen" className="w-[120px]">
            <Select value={fOrigen} onChange={e=>setFOrigen(e.target.value)}><option value="">TODOS</option>
              {['CUSCO','LIMA','AREQUIPA','PIURA'].map(d=><option key={d} value={d}>{d}</option>)}
            </Select>
          </FormField>
          <FormField label="Destino" className="w-[120px]">
            <Select value={fDestino} onChange={e=>setFDestino(e.target.value)}><option value="">TODOS</option>
              {['CUSCO','LIMA','AREQUIPA','PIURA','QUILLABANBA'].map(d=><option key={d} value={d}>{d}</option>)}
            </Select>
          </FormField>
          <FormField label="Estado" className="w-[190px]">
            <Select value={fEstado} onChange={e=>setFEstado(e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_TRANSITO">En Tránsito</option>
              <option value="DESEMBARQUE_EN_DESTINO">Desembarque en Destino</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="ANULADO">Anulado</option>
            </Select>
          </FormField>
          <FormField label="Anulado" className="w-[105px]"><Select value={fAnulado} onChange={e=>setFAnulado(e.target.value)}><option value="">TODOS</option><option value="SI">SI</option><option value="NO">NO</option></Select></FormField>
          <FormField label="Estados" className="w-[170px]"><Select value={fEstado} onChange={e=>setFEstado(e.target.value)}><option value="">Seleccionar</option><option value="PENDIENTE">No Embarcado</option><option value="EN_TRANSITO">Embarcado</option><option value="DESEMBARQUE_EN_DESTINO">Desembarcado</option><option value="ENTREGADO">Entregado</option><option value="ANULADO">Anulado</option></Select></FormField>
          <FormField label="Tipo de Cliente" className="w-[130px]"><Select value={fTipoCliente} onChange={e=>setFTipoCliente(e.target.value)}><option value="">TODOS</option><option value="NATURAL">NATURAL</option><option value="JURIDICO">JURÍDICO</option></Select></FormField>
          <FormField label="Tipo de Entrega" className="w-[130px]"><Select value={fEntrega} onChange={e=>setFEntrega(e.target.value)}><option value="">Seleccionar</option><option value="AGENCIA">Agencia</option><option value="REPARTO">Reparto</option></Select></FormField>
        </div>
        <div className="flex flex-wrap gap-2.5 items-end">
          <FormField label="Pagado" className="w-[130px]">

            <Select value={fPagado} onChange={e=>setFPagado(e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="PAGADO">Pagado</option>
              <option value="NO_PAGADO">No Pagado</option>
            </Select>
          </FormField>
          <FormField label="Filtrar Por" className="w-[130px]"><Select value={fFiltrarPor} onChange={e=>setFFiltrarPor(e.target.value)}><option value="">Seleccionar</option><option value="FECHA_EMISION">EMISIÓN</option><option value="FECHA_VIAJE">ENTREGA</option></Select></FormField>
          <FormField label="Fecha Inicio" className="w-[140px]">
            <Input type="date" value={fFechaIni} onChange={e=>setFechaIni(e.target.value)}/>
          </FormField>
          <FormField label="Fecha Fin" className="w-[140px]">
            <Input type="date" value={fFechaFin} onChange={e=>setFechaFin(e.target.value)}/>
          </FormField>
          <FormField label="Guía Remisión" className="flex-1 min-w-[160px]">
            <Input value={fGuia} onChange={e=>setFGuia(e.target.value)} placeholder="Código de guía..."/>
          </FormField>
          <Button variant="primary" icon={<Search size={13}/>} loading={loading} onClick={buscar}>Buscar</Button>
        </div>
      </Card>

      {/* Selección masiva */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
          <span className="text-[12px] text-navy-500 font-medium">{selected.size} ticket(s) seleccionado(s)</span>
          <Button variant="success" size="xs" icon={<Banknote size={11}/>}
            onClick={()=>toast.success('Pago masivo registrado')}>Pagar seleccionados</Button>
          <Button variant="dark" size="xs" icon={<CheckCircle size={11}/>}
            onClick={()=>toast.success('Marcados como entregados')}>Marcar entregados</Button>
          <Button variant="outline" size="xs" icon={<Printer size={11}/>}
            onClick={()=>toast('Imprimiendo...')}>Imprimir</Button>
          <button onClick={()=>setSelected(new Set())} className="ml-auto text-gray-400 hover:text-gray-600">
            <X size={14}/>
          </button>
        </div>
      )}

      {/* TABLA */}
      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="px-4 py-2.5">
                  <input type="checkbox"
                    checked={selected.size===tickets.length&&tickets.length>0}
                    onChange={toggleAll} className="accent-sky-brand w-3.5 h-3.5"/>
                </th>
                {['FECHA','ESTADO','TICKET','REMITENTE','DESTINATARIO','CONTENIDO','MONTO','ACCIONES'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500
                                         uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.length===0
                ? <tr><td colSpan={9} className="py-16 text-center text-gray-400">
                    <Search size={32} className="mx-auto mb-2 text-gray-300"/>
                    <p className="text-[13px]">No se encontraron resultados</p>
                  </td></tr>
                : tickets.map(t=>(
                    <TicketRow key={t.id} ticket={t}
                      selected={selected.has(t.id)}
                      onSelect={()=>toggleSelect(t.id)}
                      onDetalle={()=>setDetalle(t)}
                      onAction={(action)=>runTicketAction(t, action)}/>
                  ))
              }
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-[11px] text-gray-500">{totalTickets} registro(s)</span>
          <div className="flex items-center gap-1.5">
            <button className="w-7 h-7 border border-gray-200 rounded flex items-center justify-center text-gray-400">
              <ChevronLeft size={13}/>
            </button>
            <button className="w-7 h-7 bg-sky-brand text-white rounded text-[11px] font-medium">1</button>
            <button className="w-7 h-7 border border-gray-200 rounded flex items-center justify-center text-gray-400">
              <ChevronRight size={13}/>
            </button>
          </div>
        </div>
      </Card>

      {/* Modal detalle */}
      {detalleTicket && (
        <ModalDetalle ticket={detalleTicket} onClose={()=>setDetalle(null)} onAction={(action)=>runTicketAction(detalleTicket, action)}/>
      )}
    </div>
  )
}
