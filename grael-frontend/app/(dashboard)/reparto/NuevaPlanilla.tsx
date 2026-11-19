'use client'

import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Button, Card, Input, Select } from '@/components/ui'
import { catalogosV2Api, repartoApi, ticketsApi } from '@/lib/api'
import { hoyPeru } from '@/lib/peru-time'
import type { User } from '@/types'

type Recursos = Awaited<ReturnType<typeof repartoApi.recursos>>['data']

export function NuevaPlanilla({ user, onSaved }: { user: User; onSaved: (id: string) => Promise<void> }) {
  const [sedes, setSedes] = useState<Array<{ id: string; nombre: string }>>([])
  const [sedeId, setSede] = useState(user.sedeId || '')
  const [recursos, setRecursos] = useState<Recursos>()
  const [fecha, setFecha] = useState(hoyPeru)
  const [zona, setZona] = useState('')
  const [numeros, setNumeros] = useState('')
  const [vehiculo, setVehiculo] = useState('')
  const [repartidor, setRepartidor] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    catalogosV2Api.sedes({ activo: true }).then(r => { if (active) setSedes(r.data) })
      .catch(() => { if (active) toast.error('No se pudo consultar las sedes') })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    setRecursos(undefined)
    setVehiculo('')
    setRepartidor('')
    if (sedeId) repartoApi.recursos(sedeId).then(r => { if (active) setRecursos(r.data) })
      .catch(() => { if (active) toast.error('No se pudo consultar la flota y los repartidores de la sede') })
    return () => { active = false }
  }, [sedeId])

  async function crear(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const ticketIds: string[] = []
      for (const numeroTicket of new Set(numeros.trim().split(/[\s,]+/).filter(Boolean))) {
        const { data } = await ticketsApi.buscar({ numeroTicket, tipoEntrega: 'REPARTO' }, 1, 10)
        const ticket = data.data.find(item => item.numeroTicket === numeroTicket)
        if (!ticket) throw new Error('No se encontró el ticket de reparto ' + numeroTicket)
        ticketIds.push(ticket.id)
      }
      const { data } = await repartoApi.crear({ sedeId, fecha, zona: zona.trim() || undefined, ticketIds, vehiculoId: vehiculo, repartidorId: repartidor })
      setNumeros('')
      toast.success('Planilla de reparto creada')
      await onSaved(data.id)
    } catch (error: any) { toast.error(error.response?.data?.message || error.message || 'No se pudo crear la planilla') }
    finally { setSaving(false) }
  }

  return <Card title="Nueva planilla de reparto">
    <form onSubmit={crear} className="grid gap-3 p-3 sm:grid-cols-2">
      <label>Sede de custodia<Select value={sedeId} onChange={e => setSede(e.target.value)} required>
        <option value="">Seleccione la sede</option>
        {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </Select></label>
      <label>Fecha<Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required /></label>
      <label>Vehículo<Select value={vehiculo} onChange={e => setVehiculo(e.target.value)} required>
        <option value="">Seleccione el vehículo</option>{recursos?.vehiculos.map(v => <option key={v.id} value={v.id}>{v.placa}</option>)}
      </Select></label>
      <label>Repartidor<Select value={repartidor} onChange={e => setRepartidor(e.target.value)} required>
        <option value="">Seleccione el repartidor</option>{recursos?.repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre} {r.apellido}</option>)}
      </Select></label>
      <label>Tickets de reparto<Input value={numeros} onChange={e => setNumeros(e.target.value)} placeholder="Números de ticket separados por comas" required /></label>
      <label>Zona<Input value={zona} onChange={e => setZona(e.target.value)} maxLength={120} /></label>
      <Button type="submit" loading={saving} disabled={!recursos || !vehiculo || !repartidor}>Crear planilla</Button>
    </form>
  </Card>
}
