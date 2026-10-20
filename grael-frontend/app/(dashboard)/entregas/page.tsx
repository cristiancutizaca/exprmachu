'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, Plus, Search, Truck, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, EmptyState, FormField, Input, Modal, PageHeader, Select, StatusBadge } from '@/components/ui'
import { entregasApi } from '@/lib/api'
import { TICKETS_DB } from '@/lib/data'
import { useAuthStore } from '@/store'

interface DeliveryRow {
  id: string
  ticketId: string
  ticketLabel: string
  bultoId?: string
  tipo: string
  estado: string
  fechaProgramada?: string
  nombreReceptor?: string
  documentoReceptor?: string
  observacion?: string
}

const DEMO_DELIVERIES: DeliveryRow[] = TICKETS_DB.slice(0, 4).map((ticket, index) => ({
  id: `demo-entrega-${index + 1}`,
  ticketId: ticket.id,
  ticketLabel: ticket.numeroTicket,
  tipo: ticket.tipoEntrega,
  estado: index === 0 ? 'EN_REPARTO' : index === 1 ? 'INTENTO_FALLIDO' : 'PROGRAMADA',
  observacion: index === 1 ? 'Domicilio cerrado' : undefined,
}))

export default function EntregasPage() {
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [rows, setRows] = useState<DeliveryRow[]>(DEMO_DELIVERIES)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<DeliveryRow | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [pod, setPod] = useState({ nombreReceptor: '', documentoReceptor: '', observacion: '' })
  const [createForm, setCreateForm] = useState({ ticketId: '', bultoId: '', tipo: 'REPARTO' })

  const load = useCallback(async () => {
    if (isDemoMode) { setRows(DEMO_DELIVERIES); return }
    setLoading(true)
    try {
      const response = await entregasApi.listar({ estado: filter || undefined })
      const data = Array.isArray(response.data) ? response.data : response.data?.data || []
      setRows(data.map((row: any) => ({
        id: row.id, ticketId: row.ticketId, ticketLabel: row.ticket?.numeroTicket || row.ticketId,
        bultoId: row.bultoId, tipo: row.tipo, estado: row.estado,
        fechaProgramada: row.fechaProgramada, nombreReceptor: row.nombreReceptor,
        documentoReceptor: row.documentoReceptor, observacion: row.observacion,
      })))
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudieron cargar las entregas reales')
    } finally { setLoading(false) }
  }, [filter, isDemoMode])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => rows.filter(row => {
    const matchesState = !filter || row.estado === filter
    const needle = query.trim().toLowerCase()
    return matchesState && (!needle || row.ticketLabel.toLowerCase().includes(needle) || row.ticketId.toLowerCase().includes(needle) || (row.observacion || '').toLowerCase().includes(needle))
  }), [rows, filter, query])

  const updateLocal = (id: string, patch: Partial<DeliveryRow>) => setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row))

  const createDelivery = async () => {
    if (!createForm.ticketId.trim()) { toast.error('Ingrese el ID del ticket'); return }
    if (isDemoMode) {
      const ticket = TICKETS_DB.find(item => item.id === createForm.ticketId || item.numeroTicket === createForm.ticketId)
      const row: DeliveryRow = { id: `demo-entrega-${Date.now()}`, ticketId: createForm.ticketId, ticketLabel: ticket?.numeroTicket || createForm.ticketId, bultoId: createForm.bultoId || undefined, tipo: createForm.tipo, estado: 'PROGRAMADA' }
      setRows(current => [row, ...current]); setShowCreate(false); setCreateForm({ ticketId: '', bultoId: '', tipo: 'REPARTO' }); toast.success('Entrega creada en Demo'); return
    }
    try {
      await entregasApi.crear({ ticketId: createForm.ticketId.trim(), bultoId: createForm.bultoId.trim() || undefined, tipo: createForm.tipo })
      setShowCreate(false); setCreateForm({ ticketId: '', bultoId: '', tipo: 'REPARTO' }); await load(); toast.success('Entrega creada correctamente')
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo crear la entrega') }
  }

  const confirmDelivery = async () => {
    if (!selected || !pod.nombreReceptor.trim() || !pod.documentoReceptor.trim()) { toast.error('Complete receptor y documento'); return }
    try {
      if (isDemoMode) updateLocal(selected.id, { estado: 'ENTREGADA', nombreReceptor: pod.nombreReceptor, documentoReceptor: pod.documentoReceptor, observacion: pod.observacion })
      else { await entregasApi.entregar(selected.id, pod); await load() }
      setSelected(null); setPod({ nombreReceptor: '', documentoReceptor: '', observacion: '' }); toast.success('POD registrado correctamente')
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo confirmar la entrega') }
  }

  const failDelivery = async (row: DeliveryRow) => {
    const observation = window.prompt('Motivo del intento fallido', row.observacion || '')
    if (observation === null) return
    try {
      if (isDemoMode) updateLocal(row.id, { estado: 'INTENTO_FALLIDO', observacion: observation || 'Intento fallido' })
      else { await entregasApi.intentoFallido(row.id, { observacion: observation }); await load() }
      toast.success('Intento de entrega registrado')
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo registrar el intento') }
  }

  return (
    <div className="pb-6">
      <PageHeader title="Entregas y POD" subtitle={isDemoMode ? 'Modo Demo — datos locales, sin persistencia' : 'Sesión real — datos persistidos en el API'} actions={<Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>Nueva entrega</Button>} />
      <Card className="mb-4"><div className="flex flex-wrap items-end gap-2.5"><FormField label="Buscar ticket / observación" className="min-w-[220px] flex-1"><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Número o UUID" suffix={<Search size={12} />} /></FormField><FormField label="Estado" className="w-[190px]"><Select value={filter} onChange={event => setFilter(event.target.value)}><option value="">Todos</option><option value="PROGRAMADA">Programada</option><option value="EN_REPARTO">En reparto</option><option value="INTENTO_FALLIDO">Intento fallido</option><option value="ENTREGADA">Entregada</option><option value="DEVUELTA">Devuelta</option></Select></FormField><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>Actualizar</Button></div></Card>
      <Card padding={false} className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full border-collapse text-[11px]"><thead><tr className="border-b-2 border-gray-200 bg-gray-50">{['Estado', 'Ticket', 'Tipo', 'Bulto', 'Receptor', 'Observación', 'Acciones'].map(header => <th key={header} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">{header}</th>)}</tr></thead><tbody>{visible.length === 0 ? <tr><td colSpan={7}><EmptyState icon={<Truck size={26} />} title="Sin entregas" subtitle={isDemoMode ? 'El modo Demo no tiene registros para este filtro' : 'No hay entregas que coincidan'} /></td></tr> : visible.map(row => <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50"><td className="px-3 py-2"><StatusBadge estado={row.estado} /></td><td className="px-3 py-2 font-semibold text-navy-500">{row.ticketLabel}</td><td className="px-3 py-2">{row.tipo}</td><td className="px-3 py-2 font-mono">{row.bultoId || 'Ticket completo'}</td><td className="px-3 py-2">{row.nombreReceptor || '—'}</td><td className="max-w-[220px] truncate px-3 py-2 text-gray-500">{row.observacion || '—'}</td><td className="px-3 py-2"><div className="flex gap-1"><Button size="sm" variant="outline" disabled={['ENTREGADA', 'DEVUELTA'].includes(row.estado)} onClick={() => { setSelected(row); setPod({ nombreReceptor: row.nombreReceptor || '', documentoReceptor: row.documentoReceptor || '', observacion: row.observacion || '' }) }} icon={<CheckCircle size={12} />}>POD</Button><Button size="sm" variant="ghost" disabled={['ENTREGADA', 'DEVUELTA'].includes(row.estado)} onClick={() => void failDelivery(row)} icon={<XCircle size={12} />}>Fallo</Button></div></td></tr>)}</tbody></table></div><div className="border-t border-gray-100 px-4 py-3 text-[11px] text-gray-500">{visible.length} entrega(s) visible(s)</div></Card>

      {showCreate && <Modal open title="Nueva entrega" onClose={() => setShowCreate(false)} footer={<div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>Cancelar</Button><Button variant="primary" className="flex-1" onClick={() => void createDelivery()}>Crear</Button></div>}><div className="space-y-3"><FormField label="ID del ticket"><Input value={createForm.ticketId} onChange={event => setCreateForm(current => ({ ...current, ticketId: event.target.value }))} placeholder="UUID del ticket" /></FormField><FormField label="ID del bulto (opcional)"><Input value={createForm.bultoId} onChange={event => setCreateForm(current => ({ ...current, bultoId: event.target.value }))} placeholder="UUID del bulto" /></FormField><FormField label="Tipo"><Select value={createForm.tipo} onChange={event => setCreateForm(current => ({ ...current, tipo: event.target.value }))}><option value="REPARTO">Reparto</option><option value="AGENCIA">Agencia</option></Select></FormField></div></Modal>}
      {selected && <Modal open title={`POD — ${selected.ticketLabel}`} onClose={() => setSelected(null)} footer={<div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setSelected(null)}>Cancelar</Button><Button variant="primary" className="flex-1" onClick={() => void confirmDelivery()}>Confirmar entrega</Button></div>}><div className="space-y-3"><FormField label="Nombre del receptor"><Input value={pod.nombreReceptor} onChange={event => setPod(current => ({ ...current, nombreReceptor: event.target.value }))} /></FormField><FormField label="Documento del receptor"><Input value={pod.documentoReceptor} onChange={event => setPod(current => ({ ...current, documentoReceptor: event.target.value }))} /></FormField><FormField label="Observación"><Input value={pod.observacion} onChange={event => setPod(current => ({ ...current, observacion: event.target.value }))} placeholder="Opcional" /></FormField></div></Modal>}
    </div>
  )
}
