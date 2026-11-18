'use client'
import { useEffect, useState } from 'react'
import { ticketsApi } from '@/lib/api'
import type { Ticket } from '@/types'
import { FormField, Input, Select } from '@/components/ui'

export default function TicketFiscalSelector({ value, onSelect }: { value: string; onSelect: (ticket: Ticket | null) => void }) {
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Ticket[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let current = true
    const timer = window.setTimeout(() => {
      ticketsApi.buscar({ numeroTicket: search.trim() || undefined }, 1, 30)
        .then(({ data }) => {
          if (!current) return
          setOptions((data.data || []).filter(ticket => !ticket.anulado))
          setFailed(false)
        }).catch(() => { if (current) setFailed(true) })
    }, 200)
    return () => { current = false; window.clearTimeout(timer) }
  }, [search])

  return <div className="grid sm:grid-cols-2 gap-3">
    <FormField label="Buscar ticket por número">
      <Input aria-label="Buscar ticket por número" value={search} onChange={event => setSearch(event.target.value)} />
    </FormField>
    <FormField label="Ticket">
      <Select aria-label="Ticket" required value={value} onChange={event => onSelect(options.find(option => option.id === event.target.value) || null)}>
        {value && !options.some(option => option.id === value) && <option value={value}>Ticket seleccionado</option>}
        <option value="">{failed ? 'No se pudo cargar tickets' : 'Seleccione un ticket'}</option>
        {options.map(option => <option key={option.id} value={option.id}>{option.numeroTicket} · {option.remitente?.razonSocial}</option>)}
      </Select>
    </FormField>
  </div>
}
