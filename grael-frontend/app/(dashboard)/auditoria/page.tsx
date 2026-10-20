'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Search, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, EmptyState, FormField, Input, PageHeader, Select } from '@/components/ui'
import { auditoriaApi } from '@/lib/api'
import { useAuthStore } from '@/store'

interface AuditRow { id: string; accion: string; entidad: string; entidadId: string; sedeId?: string; usuarioId?: string; fechaHora?: string; metadata?: Record<string, unknown> }
const DEMO_AUDIT: AuditRow[] = [{ id: 'demo-audit-1', accion: 'TRACKING_MANUAL', entidad: 'TrackingEvento', entidadId: 'demo', sedeId: 'demo', fechaHora: new Date().toISOString(), metadata: { source: 'manual' } }, { id: 'demo-audit-2', accion: 'REPARTO_INICIADO', entidad: 'PlanillaReparto', entidadId: 'demo', sedeId: 'demo', fechaHora: new Date().toISOString() }]

export default function AuditoriaPage() {
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [rows, setRows] = useState<AuditRow[]>(DEMO_AUDIT)
  const [accion, setAccion] = useState('')
  const [entidad, setEntidad] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (isDemoMode) { setRows(DEMO_AUDIT); return }
    setLoading(true)
    try {
      const response = await auditoriaApi.listar({ accion: accion || undefined, entidad: entidad || undefined, limit: 100 })
      const data = response.data?.data || response.data || []
      setRows(data)
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo cargar la auditoría') }
    finally { setLoading(false) }
  }, [accion, entidad, isDemoMode])

  useEffect(() => { void load() }, [load])
  const visible = rows.filter(row => !query || `${row.accion} ${row.entidad} ${row.entidadId}`.toLowerCase().includes(query.toLowerCase()))

  return <div className="space-y-5 pb-8"><PageHeader title="Auditoría" subtitle={isDemoMode ? 'Modo Demo — eventos de ejemplo' : 'Sesión real — trazabilidad del API'} actions={<Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={() => void load()} disabled={loading}>Actualizar</Button>} /><div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] text-blue-800"><ShieldCheck size={17} /><span>Los registros son de solo lectura y se filtran por sede según el rol autenticado.</span></div><Card><div className="flex flex-wrap items-end gap-2.5"><FormField label="Buscar" className="min-w-[220px] flex-1"><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Acción, entidad o ID" suffix={<Search size={12} />} /></FormField><FormField label="Acción" className="w-[210px]"><Input value={accion} onChange={event => setAccion(event.target.value)} placeholder="TRACKING_MANUAL" /></FormField><FormField label="Entidad" className="w-[190px]"><Select value={entidad} onChange={event => setEntidad(event.target.value)}><option value="">Todas</option><option value="TrackingEvento">TrackingEvento</option><option value="PlanillaReparto">PlanillaReparto</option><option value="Egreso">Egreso</option><option value="Configuracion">Configuracion</option></Select></FormField></div></Card><Card padding={false} className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-[11px]"><thead><tr className="border-b-2 border-gray-200 bg-gray-50">{['Fecha', 'Acción', 'Entidad', 'Entidad ID', 'Sede', 'Usuario'].map(header => <th key={header} className="px-3 py-2.5 text-[10px] font-bold uppercase text-gray-500">{header}</th>)}</tr></thead><tbody>{visible.length === 0 ? <tr><td colSpan={6}><EmptyState title="Sin eventos" subtitle="No hay registros para estos filtros." /></td></tr> : visible.map(row => <tr key={row.id} className="border-b border-gray-100"><td className="px-3 py-2 text-gray-500">{row.fechaHora ? new Date(row.fechaHora).toLocaleString('es-PE') : '—'}</td><td className="px-3 py-2 font-semibold text-navy-500">{row.accion}</td><td className="px-3 py-2">{row.entidad}</td><td className="max-w-[220px] truncate px-3 py-2 font-mono text-gray-500">{row.entidadId}</td><td className="px-3 py-2 font-mono text-gray-500">{row.sedeId || '—'}</td><td className="max-w-[220px] truncate px-3 py-2 font-mono text-gray-500">{row.usuarioId || '—'}</td></tr>)}</tbody></table></div><div className="border-t border-gray-100 px-4 py-3 text-[11px] text-gray-500">{visible.length} evento(s) visible(s)</div></Card></div>
}
