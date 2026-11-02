'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, Search, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge, Button, Card, EmptyState, FormField, Input, Modal, PageHeader, Select, Textarea } from '@/components/ui'
import { incidenciasApi } from '@/lib/api'
import { useAuthStore } from '@/store'

interface IncidenciaRow {
  id: string
  ticketId: string
  bultoId?: string
  tipo: string
  estado: string
  descripcion: string
  sedeId?: string
  almacenId?: string
  usuarioId?: string
  createdAt?: string
}

const DEMO_ROWS: IncidenciaRow[] = [
  { id: 'demo-inc-1', ticketId: 'TK-2026-0007', bultoId: 'BUL-0007-02', tipo: 'FALTANTE', estado: 'ABIERTA', descripcion: 'Bulto no recibido al cierre de desembarque', sedeId: 'CUSCO', createdAt: new Date().toISOString() },
  { id: 'demo-inc-2', ticketId: 'TK-2026-0004', bultoId: 'BUL-0004-01', tipo: 'DANADO', estado: 'EN_INVESTIGACION', descripcion: 'Embalaje exterior con daño visible', sedeId: 'LIMA', createdAt: new Date().toISOString() },
]

const DISPOSICIONES = [
  ['ENCONTRADO', 'Encontrado / ingresado al almacén'],
  ['REINGRESADO_ALMACEN', 'Reingresado al almacén'],
  ['ACEPTADO_CON_DANO', 'Aceptado con daño registrado'],
  ['DEVUELTO_ORIGEN', 'Devuelto al origen'],
  ['SIN_CAMBIO_FISICO', 'Sin cambio físico (solo cierre documental)'],
] as const

const statusStyle: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'default' }> = {
  ABIERTA: { label: 'Abierta', variant: 'warning' },
  EN_INVESTIGACION: { label: 'En investigación', variant: 'info' },
  RESUELTA: { label: 'Resuelta', variant: 'success' },
  CERRADA: { label: 'Cerrada', variant: 'default' },
}

export default function IncidenciasPage() {
  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  const canResolve = ['ADMIN_SEDE', 'SUPERVISOR', 'SUPERADMIN'].includes(String(user?.rol))
  const isDemoMode = !token || token.startsWith('demo-')
  const [rows, setRows] = useState<IncidenciaRow[]>(DEMO_ROWS)
  const [tipo, setTipo] = useState('')
  const [estado, setEstado] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [selected, setSelected] = useState<IncidenciaRow | null>(null)
  const [disposicion, setDisposicion] = useState('')
  const [resolucion, setResolucion] = useState('')

  const load = useCallback(async () => {
    if (isDemoMode) { setRows(DEMO_ROWS); return }
    setLoading(true)
    try {
      const response = await incidenciasApi.listar({ tipo: tipo || undefined, estado: estado || undefined })
      setRows((response.data?.data || response.data || []) as IncidenciaRow[])
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudieron cargar las incidencias')
    } finally { setLoading(false) }
  }, [estado, isDemoMode, tipo])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => rows.filter(row => !query || `${row.id} ${row.ticketId} ${row.bultoId || ''} ${row.tipo} ${row.descripcion}`.toLowerCase().includes(query.toLowerCase())), [query, rows])

  const openResolve = (row: IncidenciaRow) => {
    if (!canResolve) return
    setSelected(row)
    setDisposicion('')
    setResolucion('')
  }

  const resolve = async () => {
    if (!selected || !canResolve || !disposicion || !resolucion.trim() || resolving) return
    setResolving(true)
    try {
      if (isDemoMode) {
        setRows(current => current.map(item => item.id === selected.id ? { ...item, estado: 'RESUELTA' } : item))
      } else {
        await incidenciasApi.resolver(selected.id, { estado: 'RESUELTA', disposicion, resolucion: resolucion.trim() })
        await load()
      }
      toast.success(isDemoMode ? 'Demo: incidencia resuelta (no guardada)' : 'Incidencia resuelta')
      setSelected(null)
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo resolver la incidencia') }
    finally { setResolving(false) }
  }

  return <div className="space-y-5 pb-8">
    <PageHeader title="Incidencias" subtitle={isDemoMode ? 'Modo Demo — registros de ejemplo' : 'Sesión real — incidencias operativas de la sede autorizada'} actions={<Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={() => void load()} disabled={loading}>Actualizar</Button>} />
    <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[12px] text-amber-800"><AlertTriangle size={17} /><span>Los faltantes detectados al cerrar un desembarque físico se registran automáticamente y quedan disponibles para investigación.</span></div>
    <Card><div className="flex flex-wrap items-end gap-2.5"><FormField label="Buscar" className="min-w-[220px] flex-1"><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ticket, bulto o descripción" suffix={<Search size={12} />} /></FormField><FormField label="Tipo" className="w-[180px]"><Select value={tipo} onChange={event => setTipo(event.target.value)}><option value="">Todos</option><option value="FALTANTE">Faltante</option><option value="DANADO">Dañado</option><option value="DIFERENCIA_PESO">Diferencia de peso</option><option value="DOCUMENTAL">Documental</option><option value="OTRO">Otro</option></Select></FormField><FormField label="Estado" className="w-[180px]"><Select value={estado} onChange={event => setEstado(event.target.value)}><option value="">Todos</option><option value="ABIERTA">Abierta</option><option value="EN_INVESTIGACION">En investigación</option><option value="RESUELTA">Resuelta</option><option value="CERRADA">Cerrada</option></Select></FormField></div></Card>
    <Card padding={false} className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-[11px]"><thead><tr className="border-b-2 border-gray-200 bg-gray-50">{['Fecha', 'Tipo', 'Estado', 'Ticket', 'Bulto', 'Descripción', 'Acción'].map(header => <th key={header} className="px-3 py-2.5 text-[10px] font-bold uppercase text-gray-500">{header}</th>)}</tr></thead><tbody>{visible.length === 0 ? <tr><td colSpan={7}><EmptyState title="Sin incidencias" subtitle="No hay registros para estos filtros." /></td></tr> : visible.map(row => { const style = statusStyle[row.estado] || { label: row.estado, variant: 'default' as const }; return <tr key={row.id} className="border-b border-gray-100 align-top"><td className="whitespace-nowrap px-3 py-2 text-gray-500">{row.createdAt ? new Date(row.createdAt).toLocaleString('es-PE') : '—'}</td><td className="px-3 py-2 font-semibold text-navy-500">{row.tipo}</td><td className="px-3 py-2"><Badge label={style.label} variant={style.variant} /></td><td className="px-3 py-2 font-mono">{row.ticketId}</td><td className="px-3 py-2 font-mono text-gray-500">{row.bultoId || '—'}</td><td className="max-w-[320px] px-3 py-2 text-gray-600">{row.descripcion}</td><td className="px-3 py-2">{canResolve && !['RESUELTA', 'CERRADA'].includes(row.estado) && <Button variant="ghost" size="sm" icon={<CheckCircle2 size={13} />} onClick={() => openResolve(row)}>Resolver</Button>}</td></tr> })}</tbody></table></div><div className="border-t border-gray-100 px-4 py-3 text-[11px] text-gray-500">{visible.length} incidencia(s) visible(s){isDemoMode ? ' · Demo' : ''}</div></Card>
    <Modal open={Boolean(selected)} title="Resolver incidencia" onClose={() => { if (!resolving) setSelected(null) }} footer={<div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setSelected(null)} disabled={resolving}>Cancelar</Button><Button variant="dark" loading={resolving} disabled={!disposicion || !resolucion.trim()} onClick={() => void resolve()}>Confirmar resolución</Button></div>}>
      <div className="space-y-3">
        <p className="text-xs text-gray-600">La disposición actualiza el estado físico de la mercadería y puede generar movimientos de almacén. Verifíquela antes de confirmar. Las entregas se confirman únicamente en Entregas y POD.</p>
        <FormField label="Disposición física" required><Select aria-label="Disposición física" value={disposicion} onChange={event => setDisposicion(event.target.value)}><option value="">Seleccione la disposición real</option>{DISPOSICIONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></FormField>
        <FormField label="Resolución / evidencia" required><Textarea aria-label="Resolución de incidencia" rows={3} maxLength={500} value={resolucion} onChange={event => setResolucion(event.target.value)} placeholder="Indique qué se verificó, quién lo confirmó y cómo quedó la carga" /></FormField>
      </div>
    </Modal>
  </div>
}
