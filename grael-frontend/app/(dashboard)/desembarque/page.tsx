'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  Ship, Search, CheckCircle, AlertTriangle, Eye,
  Package, Phone, User, MapPin, Printer, X, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, PageHeader, FormField, Input, Select, Badge, SectionTitle } from '@/components/ui'
import { DESEMBARQUE_DB, DESTINOS_LIST } from '@/lib/data'
import { desembarqueApi, manifiestoApi, catalogosV2Api } from '@/lib/api'
import { useAuthStore } from '@/store'
import type { ItemDesembarque, EstadoDesembarque } from '@/lib/data'
import { useConfirm } from '@/components/layout/GlobalModals'

const ESTADO_STYLE: Record<EstadoDesembarque, { label:string; bg:string; text:string }> = {
  PENDIENTE_VERIFICACION: { label:'Pendiente',  bg:'bg-amber-100', text:'text-amber-700' },
  VERIFICADO:             { label:'Verificado', bg:'bg-blue-100',  text:'text-blue-700' },
  ENTREGADO:              { label:'Entregado',  bg:'bg-green-100', text:'text-green-700' },
  OBSERVADO:              { label:'Observado',  bg:'bg-red-100',   text:'text-red-600' },
}

// ─── Modal de entrega ─────────────────────────────────────────────────────────
function ModalEntrega({ item, onConfirm, onClose }: {
  item: ItemDesembarque; onConfirm: (dni: string, nombre: string, obs: string) => void; onClose: () => void
}) {
  const [dniRecibe, setDniRecibe] = useState(item.dniDestinatario)
  const [nombreRecibe, setNombreRecibe] = useState(item.destinatario)
  const [obs, setObs]            = useState('')
  const [conforme, setConforme]  = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b bg-green-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600"/>
            <h3 className="font-semibold text-[14px] text-gray-800">Registrar Entrega</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
        </div>
        <div className="p-4 space-y-3">
          {/* Info del ticket */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Ticket a entregar</p>
            <p className="text-[13px] font-bold text-navy-500">{item.numeroTicket}</p>
            <p className="text-[11px] text-gray-600">{item.mercaderia}</p>
            <p className="text-[11px] text-gray-500">{item.bultos} bultos · {item.peso} kg</p>
          </div>

          {/* Destinatario esperado */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Destinatario registrado</p>
            <p className="text-[12px] font-semibold text-gray-800">{item.destinatario}</p>
            <p className="text-[11px] text-gray-500">DNI: {item.dniDestinatario}</p>
            <p className="text-[11px] text-sky-brand flex items-center gap-1">
              <Phone size={10}/> {item.telefono}
            </p>
          </div>

          {/* Quién recibe */}
          <FormField label="DNI de quien recibe *">
            <Input value={dniRecibe} onChange={e=>setDniRecibe(e.target.value)} maxLength={8}/>
          </FormField>
          <FormField label="Nombre de quien recibe *">
            <Input value={nombreRecibe} onChange={e=>setNombreRecibe(e.target.value)}
              placeholder="Nombre completo"/>
          </FormField>
          <FormField label="Observaciones (opcional)">
            <textarea
              value={obs} onChange={e=>setObs(e.target.value)}
              placeholder="Ej: Recibido con un bulto abierto, mercadería completa..."
              className="w-full border border-gray-300 rounded px-2.5 py-2 text-[12px] resize-none h-20
                         focus:outline-none focus:border-sky-brand focus:ring-2 focus:ring-sky-brand/20"/>
          </FormField>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={conforme} onChange={e=>setConforme(e.target.checked)}
              className="accent-green-600 w-4 h-4"/>
            <span className="text-[12px] text-gray-700 font-medium">
              Confirmo que la mercadería fue entregada conforme
            </span>
          </label>
        </div>
        <div className="p-4 border-t flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            variant="success" className="flex-1"
            icon={<CheckCircle size={13}/>}
            disabled={!conforme || !dniRecibe || !nombreRecibe}
            onClick={() => onConfirm(dniRecibe, nombreRecibe, obs)}>
            Confirmar Entrega
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal observación ────────────────────────────────────────────────────────
function ModalObservacion({ item, onConfirm, onClose }: {
  item: ItemDesembarque; onConfirm: (obs: string) => void; onClose: () => void
}) {
  const [obs, setObs] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b bg-red-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500"/>
            <h3 className="font-semibold text-[14px]">Registrar Observación</h3>
          </div>
          <button onClick={onClose} className="text-gray-400"><X size={16}/></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[12px] text-gray-500">Ticket: <strong>{item.numeroTicket}</strong></p>
          <FormField label="Descripción del problema *">
            <textarea value={obs} onChange={e=>setObs(e.target.value)}
              placeholder="Ej: Falta un bulto, mercadería dañada, destinatario no se presenta..."
              className="w-full border border-gray-300 rounded px-2.5 py-2 text-[12px] resize-none h-24
                         focus:outline-none focus:border-red-400"/>
          </FormField>
        </div>
        <div className="p-4 border-t flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" className="flex-1" disabled={!obs.trim()}
            onClick={() => onConfirm(obs)}>
            Registrar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Fila de item ─────────────────────────────────────────────────────────────
function DesembarqueRow({ item, onVerificar, onEntregar, onObservar }: {
  item: ItemDesembarque
  onVerificar: () => void; onEntregar: () => void; onObservar: () => void
}) {
  const est = ESTADO_STYLE[item.estado]
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${est.bg} ${est.text}`}>
          {est.label}
        </span>
      </td>
      <td className="px-3 py-3">
        <p className="text-[12px] font-bold text-navy-500">{item.numeroTicket}</p>
        <p className="text-[10px] text-gray-400">{item.manifiestoRef}</p>
      </td>
      <td className="px-3 py-3">
        <p className="text-[12px] font-medium text-gray-700">{item.destinatario}</p>
        <p className="text-[11px] text-gray-400 flex items-center gap-1">
          <User size={10}/> DNI: {item.dniDestinatario}
        </p>
        <p className="text-[11px] text-sky-brand flex items-center gap-1">
          <Phone size={10}/> {item.telefono}
        </p>
      </td>
      <td className="px-3 py-3">
        <p className="text-[11px] font-medium text-gray-700">{item.mercaderia}</p>
        {item.observacion && (
          <p className="text-[10px] text-red-500 mt-0.5">⚠ {item.observacion}</p>
        )}
      </td>
      <td className="px-3 py-3 text-center">
        <p className="text-[13px] font-bold text-gray-800">{item.bultos}</p>
        <p className="text-[10px] text-gray-400">bultos</p>
      </td>
      <td className="px-3 py-3 text-center">
        <p className="text-[13px] font-bold text-gray-800">{item.peso} kg</p>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.estado === 'PENDIENTE_VERIFICACION' && (
            <button onClick={onVerificar}
              className="px-2.5 py-1.5 bg-blue-600 text-white text-[11px] rounded
                         hover:bg-blue-700 transition-colors flex items-center gap-1 font-medium">
              <Eye size={11}/> Verificar
            </button>
          )}
          {(item.estado === 'VERIFICADO' || item.estado === 'PENDIENTE_VERIFICACION') && (
            <button onClick={onEntregar}
              className="px-2.5 py-1.5 bg-green-600 text-white text-[11px] rounded
                         hover:bg-green-700 transition-colors flex items-center gap-1 font-medium">
              <CheckCircle size={11}/> Entregar
            </button>
          )}
          {item.estado !== 'ENTREGADO' && item.estado !== 'OBSERVADO' && (
            <button onClick={onObservar}
              className="px-2.5 py-1.5 bg-red-50 text-red-600 text-[11px] rounded border border-red-200
                         hover:bg-red-100 transition-colors flex items-center gap-1">
              <AlertTriangle size={11}/> Obs.
            </button>
          )}
          <button onClick={() => window.print()}
            aria-label={`Imprimir acta ${item.numeroTicket}`}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
            <Printer size={12}/>
          </button>
          {item.horaEntrega && (
            <p className="text-[10px] text-green-600 font-medium w-full">✓ {item.horaEntrega}</p>
          )}
        </div>
      </td>
    </tr>
  )
}

function PhysicalUnloadingPanel({ isDemoMode }: { isDemoMode: boolean }) {
  const [manifiestos, setManifiestos] = useState<Array<{ id: string; codigo?: string; origen?: { nombre?: string }; destino?: { nombre?: string } }>>([])
  const [almacenes, setAlmacenes] = useState<Array<{ id: string; codigo?: string; nombre?: string }>>([])
  const [ubicaciones, setUbicaciones] = useState<Array<{ id: string; codigo?: string; nombre?: string }>>([])
  const [manifiestoId, setManifiestoId] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  const [ubicacionId, setUbicacionId] = useState('')
  const [sesionId, setSesionId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [summary, setSummary] = useState<{ expected: number; received: number; pending: number; damaged: number; extras: number; faltantes: number; estado?: string }>({ expected: 0, received: 0, pending: 0, damaged: 0, extras: 0, faltantes: 0 })
  const [busy, setBusy] = useState(false)

  const refreshSummary = useCallback(async (id: string) => {
    if (isDemoMode) return
    const response = await desembarqueApi.resumenSesion(id)
    setSummary(response.data)
  }, [isDemoMode])

  useEffect(() => {
    if (isDemoMode) return
    Promise.all([manifiestoApi.listar({ estado: 'LLEGADO' }), catalogosV2Api.almacenes()])
      .then(([manifestResponse, warehouseResponse]) => {
        setManifiestos(manifestResponse.data?.data || manifestResponse.data || [])
        setAlmacenes(warehouseResponse.data?.data || warehouseResponse.data || [])
      })
      .catch(() => toast.error('No se pudieron cargar manifiestos llegados y almacenes'))
  }, [isDemoMode])

  useEffect(() => {
    if (!almacenId || isDemoMode) { setUbicaciones([]); return }
    catalogosV2Api.ubicaciones(almacenId).then(response => setUbicaciones(response.data?.data || response.data || [])).catch(() => toast.error('No se pudieron cargar ubicaciones'))
  }, [almacenId, isDemoMode])

  const abrir = async () => {
    if (isDemoMode) { setSesionId('demo-sesion'); setSummary({ expected: 3, received: 0, pending: 3, damaged: 0, extras: 0, faltantes: 3, estado: 'ABIERTA' }); toast.success('Demo: sesión de desembarque abierta'); return }
    if (!manifiestoId || !almacenId || !ubicacionId) { toast.error('Seleccione manifiesto, almacén y ubicación'); return }
    setBusy(true)
    try { const response = await desembarqueApi.abrirSesion({ manifiestoId, almacenDestinoId: almacenId, ubicacionDestinoId: ubicacionId }); setSesionId(response.data.id); await refreshSummary(response.data.id); toast.success('Sesión de desembarque abierta') }
    catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo abrir la sesión') }
    finally { setBusy(false) }
  }

  const escanear = async () => {
    const value = codigo.trim(); if (!sesionId || !value) return
    if (isDemoMode) { setCodigo(''); setSummary(previous => ({ ...previous, received: Math.min(previous.expected, previous.received + 1), pending: Math.max(0, previous.pending - 1), faltantes: Math.max(0, previous.faltantes - 1) })); toast.success('Demo: bulto recibido'); document.getElementById('desembarque-scan')?.focus(); return }
    setBusy(true)
    try { const response = await desembarqueApi.escanearBulto(sesionId, { codigo: value }); setCodigo(''); await refreshSummary(sesionId); toast.success(response.data?.alreadyScanned ? 'Bulto ya escaneado' : 'Bulto recibido'); document.getElementById('desembarque-scan')?.focus() }
    catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo registrar el escaneo'); document.getElementById('desembarque-scan')?.focus() }
    finally { setBusy(false) }
  }

  const cerrar = async () => {
    if (!sesionId) return
    if (summary.pending > 0 && !motivo.trim()) { toast.error('Indique el motivo de la diferencia antes de cerrar'); return }
    if (isDemoMode) { setSummary(previous => ({ ...previous, estado: 'CERRADA' })); toast.success('Demo: conciliación cerrada'); return }
    setBusy(true)
    try { await desembarqueApi.cerrarSesion(sesionId, motivo); await refreshSummary(sesionId); toast.success('Desembarque conciliado y cerrado') }
    catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo cerrar la sesión') }
    finally { setBusy(false) }
  }

  return <Card className="mb-4 border-sky-100">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><div><SectionTitle>Desembarque físico por bulto</SectionTitle><p className="text-[11px] text-gray-500">{isDemoMode ? 'Modo Demo — los escaneos no persisten' : 'Sesión real — cada escaneo persiste en PostgreSQL'}</p></div><Badge variant={sesionId ? (summary.estado === 'CERRADA' ? 'default' : 'success') : 'warning'} label={sesionId ? (summary.estado || 'ABIERTA') : 'SIN SESIÓN'} /></div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
      <FormField label="Manifiesto llegado"><Select value={manifiestoId} onChange={e => setManifiestoId(e.target.value)} disabled={Boolean(sesionId)}><option value="">Seleccione</option>{manifiestos.map(m => <option key={m.id} value={m.id}>{m.codigo} · {m.origen?.nombre || ''} → {m.destino?.nombre || ''}</option>)}</Select></FormField>
      <FormField label="Almacén destino"><Select value={almacenId} onChange={e => { setAlmacenId(e.target.value); setUbicacionId('') }} disabled={Boolean(sesionId)}><option value="">Seleccione</option>{almacenes.map(a => <option key={a.id} value={a.id}>{a.codigo || a.nombre || a.id}</option>)}</Select></FormField>
      <FormField label="Recepción destino"><Select value={ubicacionId} onChange={e => setUbicacionId(e.target.value)} disabled={Boolean(sesionId)}><option value="">Seleccione</option>{ubicaciones.map(u => <option key={u.id} value={u.id}>{u.codigo || u.nombre || u.id}</option>)}</Select></FormField>
      <div className="flex items-end"><Button className="w-full" variant="primary" disabled={busy || Boolean(sesionId)} onClick={abrir}>Abrir desembarque</Button></div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">{[['Esperados', summary.expected], ['Recibidos', summary.received], ['Pendientes', summary.pending], ['Dañados', summary.damaged], ['Faltantes', summary.faltantes]].map(([label, value]) => <div key={String(label)} className="rounded border border-gray-100 bg-gray-50 px-3 py-2"><p className="text-[10px] text-gray-500">{label}</p><p className="text-lg font-bold text-navy-500">{value}</p></div>)}</div>
    {sesionId && summary.estado !== 'CERRADA' && <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end"><FormField label="Código de bulto · Enter para escanear"><Input id="desembarque-scan" autoFocus value={codigo} onChange={e => setCodigo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void escanear() }} placeholder="GRAEL:BULTO o código" /></FormField><Button variant="outline" disabled={busy || !codigo.trim()} onClick={escanear}>Escanear</Button><FormField label="Motivo si hay diferencia"><Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Obligatorio con faltantes" /></FormField><Button variant="success" disabled={busy} onClick={cerrar}>Cerrar conciliación</Button></div>}
  </Card>
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────
export default function DesembarquePage() {
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [items, setItems]          = useState<ItemDesembarque[]>(DESEMBARQUE_DB)
  const [loading, setLoading]      = useState(false)
  const [entregaItem, setEntrega]  = useState<ItemDesembarque | null>(null)
  const [obsItem,     setObs]      = useState<ItemDesembarque | null>(null)
  const [filtroEstado, setFiltro]  = useState<string>('')
  const [filtroTicket, setFiltroTicket] = useState('')
  const [filtroDestinatario, setFiltroDestinatario] = useState('')
  const [filtroManifiesto, setFiltroManifiesto] = useState('')
  const confirm = useConfirm()

  const cargarDesembarques = useCallback(async () => {
    if (isDemoMode) { setItems(DESEMBARQUE_DB); return }
    setLoading(true)
    try {
      const response = await desembarqueApi.listar()
      const rows = response.data?.data || response.data || []
      setItems(rows.map((d: any) => {
        const ticket = d.ticket || {}
        const mercaderias = ticket.mercaderias || []
        return {
          id: d.id, numeroTicket: ticket.numeroTicket || d.ticketId, manifiestoRef: d.manifiestoRef || '—',
          destinatario: ticket.destinatario?.razonSocial || '—', dniDestinatario: ticket.destinatario?.dni || ticket.destinatario?.ruc || '—', telefono: ticket.destinatario?.telefono || '—',
          mercaderia: mercaderias.map((m: any) => m.tipo).join(', ') || '—', bultos: ticket.bultos?.length || mercaderias.reduce((s: number, m: any) => s + Number(m.cantidad || 0), 0), peso: mercaderias.reduce((s: number, m: any) => s + Number(m.pesoTotal || 0), 0),
          estado: d.estado, observacion: d.observacion || undefined, horaEntrega: d.horaEntrega ? new Date(d.horaEntrega).toLocaleString('es-PE') : undefined,
        }
      }))
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo cargar desembarque real') }
    finally { setLoading(false) }
  }, [isDemoMode])

  useEffect(() => { cargarDesembarques() }, [cargarDesembarques])

  const filtrados = items.filter(i =>
    (!filtroEstado || i.estado === filtroEstado) &&
    (!filtroTicket || i.numeroTicket.toLowerCase().includes(filtroTicket.toLowerCase())) &&
    (!filtroDestinatario || `${i.destinatario} ${i.dniDestinatario}`.toLowerCase().includes(filtroDestinatario.toLowerCase())) &&
    (!filtroManifiesto || i.manifiestoRef.toLowerCase().includes(filtroManifiesto.toLowerCase()))
  )

  const pendientes  = items.filter(i=>i.estado==='PENDIENTE_VERIFICACION').length
  const verificados = items.filter(i=>i.estado==='VERIFICADO').length
  const entregados  = items.filter(i=>i.estado==='ENTREGADO').length
  const observados  = items.filter(i=>i.estado==='OBSERVADO').length

  const update = (id: string, changes: Partial<ItemDesembarque>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...changes } : i))

  const handleVerificar = async (item: ItemDesembarque) => {
    try {
      if (isDemoMode) update(item.id, { estado: 'VERIFICADO' })
      else { await desembarqueApi.verificar(item.id); await cargarDesembarques() }
      toast.success(`Ticket ${item.numeroTicket} verificado — listo para entrega`)
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo verificar el desembarque') }
  }

  const handleEntrega = async (item: ItemDesembarque, dniRecibe: string, nombreRecibe: string, obs: string) => {
    setEntrega(null)
    try {
      if (isDemoMode) update(item.id, { estado: 'ENTREGADO', horaEntrega: new Date().toLocaleString('es-PE'), observacion: obs || undefined })
      else { await desembarqueApi.entregar(item.id, { dniRecibe, nombreRecibe, observacion: obs }); await cargarDesembarques() }
      toast.success(`Entrega registrada para ticket ${item.numeroTicket}`)
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo registrar la entrega') }
  }

  const handleObservacion = async (item: ItemDesembarque, observacion: string) => {
    setObs(null)
    try {
      if (isDemoMode) update(item.id, { estado: 'OBSERVADO', observacion })
      else { await desembarqueApi.observar(item.id, observacion); await cargarDesembarques() }
      toast.error(`Observación registrada en ${item.numeroTicket}`)
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo registrar la observación') }
  }

  return (
    <div className="pb-6">
      <PageHeader
        title="Desembarque"
        subtitle={isDemoMode ? 'Modo Demo — datos locales' : 'Sesión real — datos del API'}
        actions={
          <Button variant="secondary" size="sm" icon={<Printer size={13}/>}
            onClick={() => window.print()}>
            Reporte del día
          </Button>
        }
      />

      <PhysicalUnloadingPanel isDemoMode={isDemoMode} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label:'Pendientes',  value:pendientes,  color:'bg-amber-500',  textColor:'text-amber-700', est:'PENDIENTE_VERIFICACION' },
          { label:'Verificados', value:verificados, color:'bg-blue-500',   textColor:'text-blue-700',  est:'VERIFICADO' },
          { label:'Entregados',  value:entregados,  color:'bg-green-600',  textColor:'text-green-700', est:'ENTREGADO' },
          { label:'Observados',  value:observados,  color:'bg-red-500',    textColor:'text-red-600',   est:'OBSERVADO' },
        ].map(({ label, value, color, textColor, est }) => (
          <button key={label} onClick={() => setFiltro(filtroEstado === est ? '' : est)}
            className={`bg-white rounded-lg p-4 shadow-card text-left hover:shadow-md transition-shadow
                        border-2 ${filtroEstado === est ? 'border-sky-brand' : 'border-transparent'}`}>
            <div className={`w-3 h-3 ${color} rounded-full mb-2`}/>
            <p className={`text-[24px] font-black ${textColor}`}>{value}</p>
            <p className="text-[11px] text-gray-500">{label}</p>
          </button>
        ))}
      </div>

      {/* Filtro rápido */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-2.5 items-end">
          <FormField label="N° Ticket" className="w-[140px]">
            <Input value={filtroTicket} onChange={e => setFiltroTicket(e.target.value)} placeholder="301-06..."/>
          </FormField>
          <FormField label="Destinatario / DNI" className="flex-1 min-w-[180px]">
            <Input value={filtroDestinatario} onChange={e => setFiltroDestinatario(e.target.value)} placeholder="Nombre o DNI del destinatario"/>
          </FormField>
          <FormField label="Manifiesto" className="w-[160px]">
            <Input value={filtroManifiesto} onChange={e => setFiltroManifiesto(e.target.value)} placeholder="MAN-2026-..."/>
          </FormField>
          <FormField label="Estado" className="w-[180px]">
            <Select value={filtroEstado} onChange={e=>setFiltro(e.target.value)}>
              <option value="">Todos</option>
              <option value="PENDIENTE_VERIFICACION">Pendiente Verificación</option>
              <option value="VERIFICADO">Verificado</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="OBSERVADO">Observado</option>
            </Select>
          </FormField>
          <Button variant="primary" icon={<Search size={13}/>} onClick={() => void cargarDesembarques()}>Buscar</Button>
        </div>
      </Card>

      {/* Tabla */}
      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                {['Estado','Ticket','Destinatario','Mercadería','Bultos','Peso','Acciones'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-gray-400">
                  <Ship size={32} className="mx-auto mb-2 text-gray-200"/>
                  <p className="text-[13px]">No hay items en este estado</p>
                </td></tr>
              ) : filtrados.map(item => (
                <DesembarqueRow key={item.id} item={item}
                  onVerificar={() => handleVerificar(item)}
                  onEntregar={() => setEntrega(item)}
                  onObservar={() => setObs(item)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-[11px] text-gray-500">
          {filtrados.length} item(s) {filtroEstado ? `en estado "${ESTADO_STYLE[filtroEstado as EstadoDesembarque]?.label}"` : 'en total'}
        </div>
      </Card>

      {entregaItem && (
        <ModalEntrega item={entregaItem}
          onConfirm={(dni, nombre, obs) => handleEntrega(entregaItem, dni, nombre, obs)}
          onClose={() => setEntrega(null)}/>
      )}
      {obsItem && (
        <ModalObservacion item={obsItem}
          onConfirm={(obs) => handleObservacion(obsItem, obs)}
          onClose={() => setObs(null)}/>
      )}
    </div>
  )
}
