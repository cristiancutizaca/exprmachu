'use client'

import { FormEvent, useState } from 'react'
import { Search, MapPin, PackageCheck, Clock3, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { trackingApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { Button, Card, Input, Badge } from '@/components/ui'

const DEMO_EVENTS = [
  { tipoEvento: 'RECEPCIONADO', fechaHora: '2026-08-19T08:15:00' },
  { tipoEvento: 'INGRESO_ALMACEN', fechaHora: '2026-08-19T09:10:00' },
  { tipoEvento: 'PROGRAMADO', fechaHora: '2026-08-19T11:30:00' },
]

export default function TrackingPublicPage() {
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [codigo, setCodigo] = useState('301-0631089')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<any>(null)

  const consultar = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!codigo.trim()) { toast.error('Ingrese un código de ticket'); return }
    setLoading(true)
    try {
      if (isDemoMode) {
        setResultado({ codigo: codigo.trim(), origen: 'CUSCO', destino: 'LIMA', estado: 'EN_TRANSITO', eventos: DEMO_EVENTS })
      } else {
        const response = await trackingApi.publico(codigo.trim())
        setResultado(response.data)
      }
    } catch (error: any) {
      setResultado(null)
      toast.error(error.response?.data?.message || 'No se encontró el código de tracking')
    } finally { setLoading(false) }
  }

  return <main className="min-h-screen bg-[#f4f8fb] px-4 py-10">
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <p className="text-xs font-bold tracking-[0.25em] text-sky-brand">GRAEL</p>
        <h1 className="mt-2 text-2xl font-semibold text-navy-500">Consulta pública de envío</h1>
        <p className="mt-2 text-sm text-gray-500">Consulte el último estado y los eventos visibles de su ticket.</p>
        {isDemoMode && <Badge className="mt-3" variant="warning" label="MODO DEMO" />}
      </div>
      <Card>
        <form onSubmit={consultar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1"><label className="mb-1 block text-[11px] font-semibold text-gray-500">Código de ticket</label><Input value={codigo} onChange={e=>setCodigo(e.target.value)} placeholder="Ej. 301-0631089" /></div>
          <Button type="submit" loading={loading} icon={<Search size={14}/>}>Consultar</Button>
        </form>
      </Card>
      {resultado && <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div><p className="text-[10px] uppercase tracking-wider text-gray-400">Ticket</p><p className="text-lg font-bold text-navy-500">{resultado.codigo}</p></div>
          <Badge variant="info" label={resultado.estado} />
          <div className="flex items-center gap-2 text-sm text-gray-600"><MapPin size={15} className="text-sky-brand" />{resultado.origen} → {resultado.destino}</div>
        </div>
        <div className="mt-5 space-y-4">
          {(resultado.eventos || []).map((event: any, index: number) => <div key={`${event.tipoEvento}-${index}`} className="flex gap-3"><div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-sky-brand"><PackageCheck size={14}/></div><div><p className="text-sm font-semibold text-gray-700">{event.tipoEvento}</p><p className="flex items-center gap-1 text-[11px] text-gray-400"><Clock3 size={11}/>{new Date(event.fechaHora).toLocaleString('es-PE')}</p></div></div>)}
        </div>
      </Card>}
      {!resultado && <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400"><AlertCircle size={14}/>La consulta pública no expone datos personales ni credenciales.</div>}
    </div>
  </main>
}
