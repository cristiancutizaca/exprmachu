'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, CircleDollarSign, RefreshCw, X } from 'lucide-react'
import { egresosApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { Button, Card, EmptyState, PageHeader } from '@/components/ui'

const DEMO_EXPENSES = [
  { id: 'demo-egreso-1', fecha: new Date().toISOString(), categoria: 'COMBUSTIBLE', concepto: 'Combustible ruta Lima–Huancayo', monto: 280, estado: 'PENDIENTE', sede: { nombre: 'Lima Centro' } },
  { id: 'demo-egreso-2', fecha: new Date().toISOString(), categoria: 'PEAJE', concepto: 'Peajes manifiesto MAN-DEMO-001', monto: 45, estado: 'APROBADO', sede: { nombre: 'Lima Centro' } },
]

export default function EgresosPage() {
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [egresos, setEgresos] = useState<any[]>(DEMO_EXPENSES)
  const [loading, setLoading] = useState(false)
  const [categoria, setCategoria] = useState('COMBUSTIBLE')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')

  const load = useCallback(async () => {
    if (isDemoMode) { setEgresos(DEMO_EXPENSES); return }
    setLoading(true)
    try { setEgresos((await egresosApi.listar()).data || []) }
    catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo cargar Egresos') }
    finally { setLoading(false) }
  }, [isDemoMode])

  useEffect(() => { void load() }, [load])

  const crear = async () => {
    const value = Number(monto)
    if (!concepto.trim() || !Number.isFinite(value) || value <= 0) { toast.error('Ingrese concepto y monto válido'); return }
    if (isDemoMode) { toast.success('Demo: egreso creado como pendiente'); setConcepto(''); setMonto(''); return }
    try { await egresosApi.crear({ categoria, concepto, monto: value, afectaCaja: true }); toast.success('Egreso creado'); setConcepto(''); setMonto(''); await load() }
    catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo crear el egreso') }
  }

  const decision = async (id: string, approve: boolean) => {
    if (isDemoMode) { toast.success(`Demo: egreso ${approve ? 'aprobado' : 'rechazado'}`); return }
    try { if (approve) await egresosApi.aprobar(id); else await egresosApi.rechazar(id, 'Rechazado desde panel'); toast.success(approve ? 'Egreso aprobado' : 'Egreso rechazado'); await load() }
    catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo actualizar el egreso') }
  }

  const total = useMemo(() => egresos.filter(item => item.estado === 'APROBADO').reduce((sum, item) => sum + Number(item.monto || 0), 0), [egresos])

  return (
    <div className="space-y-5 pb-8">
      <PageHeader title="Egresos" subtitle="Solicitudes, aprobación y salida controlada de caja" actions={<Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={() => void load()}>Actualizar</Button>} />
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800"><CircleDollarSign size={16} /><span><strong>{isDemoMode ? 'Modo Demo' : 'Modo API real'}</strong> · {isDemoMode ? 'Las acciones son locales y no afectan caja.' : 'La aprobación con afectaCaja requiere caja abierta y autorización.'}</span></div>
      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <Card title="Nueva solicitud">
          <div className="space-y-3"><label className="block text-[11px] font-semibold text-gray-500">Categoría<select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={categoria} onChange={event => setCategoria(event.target.value)}><option>COMBUSTIBLE</option><option>PEAJE</option><option>MANTENIMIENTO</option><option>VIATICO</option><option>SERVICIO</option><option>OTRO</option></select></label><label className="block text-[11px] font-semibold text-gray-500">Concepto<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={concepto} onChange={event => setConcepto(event.target.value)} placeholder="Detalle del gasto" /></label><label className="block text-[11px] font-semibold text-gray-500">Monto<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" type="number" min="0" step="0.01" value={monto} onChange={event => setMonto(event.target.value)} placeholder="0.00" /></label><Button variant="dark" className="w-full" onClick={() => void crear()}>Crear solicitud</Button></div>
        </Card>
        <Card title="Resumen aprobado"><p className="text-[11px] uppercase tracking-wider text-gray-400">Salida aprobada acumulada</p><p className="mt-2 text-3xl font-black text-navy-500">S/ {total.toFixed(2)}</p><p className="mt-1 text-[11px] text-gray-500">Se contabiliza en caja al aprobar, no al solicitar.</p></Card>
      </div>
      <Card title="Solicitudes de egreso">
        {loading ? <p className="p-5 text-sm text-gray-500">Cargando...</p> : egresos.length === 0 ? <EmptyState title="Sin egresos" subtitle="No existen solicitudes para los filtros actuales." /> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b text-[10px] uppercase text-gray-400"><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Categoría</th><th className="px-3 py-3">Concepto</th><th className="px-3 py-3">Monto</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3" /></tr></thead><tbody>{egresos.map(item => <tr key={item.id} className="border-b border-gray-100 text-[12px]"><td className="px-3 py-3 font-mono">{new Date(item.fecha || item.createdAt).toLocaleDateString('es-PE')}</td><td className="px-3 py-3 font-semibold">{item.categoria}</td><td className="px-3 py-3">{item.concepto}</td><td className="px-3 py-3 font-black">S/ {Number(item.monto || 0).toFixed(2)}</td><td className="px-3 py-3"><span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold">{item.estado}</span></td><td className="px-3 py-3 text-right">{item.estado === 'PENDIENTE' && <span className="inline-flex gap-1"><Button variant="ghost" size="sm" title="Aprobar" onClick={() => void decision(item.id, true)}><Check size={13} /></Button><Button variant="ghost" size="sm" title="Rechazar" onClick={() => void decision(item.id, false)}><X size={13} /></Button></span>}</td></tr>)}</tbody></table></div>}
      </Card>
    </div>
  )
}
