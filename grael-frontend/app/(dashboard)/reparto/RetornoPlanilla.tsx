'use client'

import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Button, Input, Select } from '@/components/ui'
import { catalogosV2Api, repartoApi } from '@/lib/api'

type Ubicacion = { id: string; nombre?: string; codigo: string }

export function RetornoPlanilla({ planillaId, sedeId, onCancel, onSaved }: {
  planillaId: string; sedeId: string; onCancel: () => void; onSaved: () => Promise<void>
}) {
  const [almacenes, setAlmacenes] = useState<Ubicacion[]>([])
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [almacenId, setAlmacen] = useState('')
  const [ubicacionId, setUbicacion] = useState('')
  const [observacion, setObservacion] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    catalogosV2Api.almacenes({ sedeId, estado: 'ACTIVO' }).then(r => { if (active) setAlmacenes(r.data) })
      .catch(() => { if (active) toast.error('No se pudieron consultar los almacenes de retorno') })
    return () => { active = false }
  }, [sedeId])

  useEffect(() => {
    let active = true
    if (almacenId) catalogosV2Api.ubicaciones(almacenId).then(r => { if (active) setUbicaciones(r.data) })
      .catch(() => { if (active) toast.error('No se pudieron consultar las ubicaciones') })
    return () => { active = false }
  }, [almacenId])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await repartoApi.retorno(planillaId, { almacenDestinoId: almacenId, ubicacionDestinoId: ubicacionId, observacion })
      toast.success('Retorno registrado')
      await onSaved()
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo registrar el retorno') }
    finally { setSaving(false) }
  }

  return <form onSubmit={save} className="grid gap-3 rounded-lg border border-gray-200 p-3 text-sm">
    <label>Almacén de retorno<Select value={almacenId} onChange={e => { setAlmacen(e.target.value); setUbicacion(''); setUbicaciones([]) }} required>
      <option value="">Seleccione almacén</option>
      {almacenes.map(item => <option key={item.id} value={item.id}>{item.nombre || item.codigo}</option>)}
    </Select></label>
    <label>Ubicación de retorno<Select value={ubicacionId} onChange={e => setUbicacion(e.target.value)} required>
      <option value="">Seleccione ubicación</option>
      {ubicaciones.map(item => <option key={item.id} value={item.id}>{item.nombre || item.codigo}</option>)}
    </Select></label>
    <label>Observación del retorno<Input value={observacion} onChange={e => setObservacion(e.target.value)} maxLength={500} /></label>
    <div className="flex gap-2">
      <Button variant="ghost" type="button" onClick={onCancel}>Cancelar</Button>
      <Button type="submit" disabled={!almacenId || !ubicacionId} loading={saving}>Registrar retorno</Button>
    </div>
  </form>
}
