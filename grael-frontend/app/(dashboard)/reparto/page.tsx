'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, ClipboardList, Play, RefreshCw, Truck, XCircle } from 'lucide-react'
import { repartoApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { Button, Card, PageHeader, Badge, EmptyState } from '@/components/ui'

const DEMO_SHEETS = [
  { id: 'demo-planilla-1', fecha: new Date().toISOString().slice(0, 10), zona: 'Lima Centro', estado: 'EN_RUTA', sede: { nombre: 'Lima Centro' }, vehiculo: { placa: 'ABC-123' }, repartidor: { username: 'repartidor.demo' } },
  { id: 'demo-planilla-2', fecha: new Date().toISOString().slice(0, 10), zona: 'Callao', estado: 'ASIGNADO', sede: { nombre: 'Callao' }, vehiculo: { placa: 'DEF-456' }, repartidor: { username: 'ruta.demo' } },
]

const statusClass: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-600', ASIGNADO: 'bg-blue-100 text-blue-700', EN_RUTA: 'bg-amber-100 text-amber-700', FINALIZADO: 'bg-green-100 text-green-700', ANULADO: 'bg-red-100 text-red-700',
}

export default function RepartoPage() {
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [planillas, setPlanillas] = useState<any[]>(DEMO_SHEETS)
  const [selected, setSelected] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (isDemoMode) { setPlanillas(DEMO_SHEETS); return }
    setLoading(true)
    try {
      const response = await repartoApi.listar()
      setPlanillas(response.data || [])
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo cargar Reparto')
    } finally { setLoading(false) }
  }, [isDemoMode])

  useEffect(() => { void load() }, [load])

  const openDetail = async (planilla: any) => {
    if (isDemoMode) { setSelected({ ...planilla, detalles: [{ id: 'demo-detalle-1', ticket: { numeroTicket: 'TKT-DEMO-001' }, bulto: { codigo: 'BUL-DEMO-001' }, estado: 'PENDIENTE', intentos: 0 }] }); return }
    try { setSelected((await repartoApi.detalle(planilla.id)).data) } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo abrir el detalle') }
  }

  const action = async (kind: 'iniciar' | 'finalizar', planilla: any) => {
    if (isDemoMode) { toast.success(`Demo: ${kind === 'iniciar' ? 'reparto iniciado' : 'planilla finalizada'}`); return }
    try {
      if (kind === 'iniciar') await repartoApi.iniciar(planilla.id)
      else await repartoApi.finalizar(planilla.id)
      toast.success(kind === 'iniciar' ? 'Reparto iniciado' : 'Planilla finalizada')
      await load()
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo completar la acción') }
  }

  const registrarIntento = async (detail: any, estado: string) => {
    const observacion = window.prompt('Observación del intento', detail.observacion || '')
    if (observacion === null) return
    if (isDemoMode) { toast.success(`Demo: intento ${estado} registrado`); return }
    try { await repartoApi.intento(detail.id, { estado, observacion }); if (selected) await openDetail(selected); toast.success('Intento registrado') }
    catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo registrar el intento') }
  }

  const registrarRetorno = async (planilla: any) => {
    const almacenDestinoId = window.prompt('UUID del almacén destino')
    const ubicacionDestinoId = window.prompt('UUID de la ubicación destino')
    if (!almacenDestinoId || !ubicacionDestinoId) return
    const observacion = window.prompt('Observación del retorno', '') || undefined
    if (isDemoMode) { toast.success('Demo: retorno a almacén simulado'); return }
    try { await repartoApi.retorno(planilla.id, { almacenDestinoId, ubicacionDestinoId, observacion }); await load(); if (selected) await openDetail(selected); toast.success('Retorno registrado') }
    catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo registrar el retorno') }
  }

  const summary = useMemo(() => ({ total: planillas.length, enRuta: planillas.filter(item => item.estado === 'EN_RUTA').length, asignadas: planillas.filter(item => item.estado === 'ASIGNADO').length }), [planillas])

  return (
    <div className="space-y-5 pb-8">
      <PageHeader title="Reparto" subtitle="Planillas de última milla y seguimiento de entregas" actions={<Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={() => void load()}>Actualizar</Button>} />
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
        <Truck size={16} /><span><strong>{isDemoMode ? 'Modo Demo' : 'Modo API real'}</strong> · {isDemoMode ? 'Las acciones no persisten.' : 'Las acciones se ejecutan en PostgreSQL y requieren permisos V4.'}</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card><p className="text-[11px] uppercase text-gray-400">Planillas</p><p className="mt-1 text-2xl font-black text-navy-500">{summary.total}</p></Card>
        <Card><p className="text-[11px] uppercase text-gray-400">En ruta</p><p className="mt-1 text-2xl font-black text-amber-600">{summary.enRuta}</p></Card>
        <Card><p className="text-[11px] uppercase text-gray-400">Asignadas</p><p className="mt-1 text-2xl font-black text-sky-brand">{summary.asignadas}</p></Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <Card title="Planillas de reparto">
          {loading ? <p className="p-6 text-sm text-gray-500">Cargando...</p> : planillas.length === 0 ? <EmptyState title="Sin planillas" subtitle="No hay planillas para la sede y filtros actuales." /> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b text-[10px] uppercase text-gray-400"><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Zona</th><th className="px-3 py-3">Vehículo</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3" /></tr></thead><tbody>{planillas.map(planilla => <tr key={planilla.id} className="border-b border-gray-100 text-[12px]"><td className="px-3 py-3 font-mono">{planilla.fecha}</td><td className="px-3 py-3 font-semibold">{planilla.zona || '—'}</td><td className="px-3 py-3">{planilla.vehiculo?.placa || 'Sin asignar'}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass[planilla.estado] || 'bg-gray-100 text-gray-600'}`}>{planilla.estado}</span></td><td className="px-3 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => void openDetail(planilla)}>Detalle</Button></td></tr>)}</tbody></table></div>}
        </Card>
        <Card title="Detalle operativo">
          {!selected ? <div className="flex min-h-[220px] items-center justify-center"><EmptyState title="Seleccione una planilla" subtitle="Aquí verá bultos, intentos y acciones de ruta." /></div> : <div className="space-y-4"><div><p className="text-[11px] text-gray-400">Zona</p><p className="font-bold text-navy-500">{selected.zona || '—'}</p><p className="text-[11px] text-gray-500">{selected.vehiculo?.placa || 'Sin vehículo'} · {selected.repartidor?.username || 'Sin repartidor'}</p></div><div className="space-y-2">{(selected.detalles || []).map((detail: any) => <div key={detail.id} className="rounded-lg border border-gray-100 p-3"><div className="flex items-center justify-between"><span className="font-semibold text-[12px]">{detail.ticket?.numeroTicket || detail.ticketId}</span><span className="text-[10px] text-gray-500">{detail.estado}</span></div><p className="mt-1 font-mono text-[11px] text-gray-500">{detail.bulto?.codigo || detail.bultoId}</p><div className="mt-2 flex gap-1"><Button variant="outline" size="sm" icon={<CheckCircle2 size={11} />} onClick={() => void registrarIntento(detail, 'ENTREGADO')}>Entregado</Button><Button variant="ghost" size="sm" icon={<XCircle size={11} />} onClick={() => void registrarIntento(detail, 'CLIENTE_AUSENTE')}>Fallo</Button></div></div>)}</div><div className="flex flex-wrap gap-2"><Button variant="secondary" size="sm" icon={<Play size={12} />} onClick={() => void action('iniciar', selected)}>Iniciar</Button><Button variant="dark" size="sm" icon={<CheckCircle2 size={12} />} onClick={() => void action('finalizar', selected)}>Finalizar</Button><Button variant="outline" size="sm" icon={<Truck size={12} />} onClick={() => void registrarRetorno(selected)}>Retorno</Button></div></div>}
        </Card>
      </div>
    </div>
  )
}
