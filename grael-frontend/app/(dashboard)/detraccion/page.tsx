'use client'
import { isDemoSession } from '@/lib/demo-session'
import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { BrandHero } from '@/components/brand/BrandIdentity'
import { Button, Card, FormField, Input, Select } from '@/components/ui'
import TicketFiscalSelector from '@/components/ui/TicketFiscalSelector'
import { comprobantesApi } from '@/lib/api'
import { mensajeApi } from '@/lib/archivos'
import { formatMoney, exportToCSV } from '@/lib/utils'
import { useAuthStore } from '@/store'
import type { Ticket } from '@/types'

type Estimate = { aplica: boolean; base: number; monto: number; tasa: number }

export default function DetraccionPage() {
  const token = useAuthStore(state => state.token)
  const demo = isDemoSession(token)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [importe, setImporte] = useState('')
  const [ref, setRef] = useState('')
  const [result, setResult] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(false)

  return <div className="space-y-4">
    <BrandHero compact title="Detracción de transporte" description="Estimación del SPOT para transporte de bienes por vía terrestre." />
    {demo ? <Card className="p-4">El cálculo está disponible con una sesión operativa.</Card> : <Card className="p-4 space-y-4">
      <TicketFiscalSelector value={ticket?.id || ''} onSelect={item => { setTicket(item); setImporte(item ? String(item.total) : ''); setResult(null) }}/>
      <form className="space-y-4" onChange={() => setResult(null)} onSubmit={async event => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        setLoading(true)
        try {
          const response = await comprobantesApi.calcularDetraccion({
            importe: Number(importe), valorReferencial: ref === 'SI' ? Number(data.get('referencial')) : undefined,
            gravado: data.get('gravado') === 'on', domiciliado: data.get('domiciliado') === 'on',
            sustentaCreditoOCosto: data.get('credito') === 'on', sectorPublico: data.get('sectorPublico') === 'on',
          })
          setResult(response.data)
        } catch (error) { toast.error(mensajeApi(error, 'No se pudo calcular la detracción')) }
        finally { setLoading(false) }
      }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Importe de la operación"><Input aria-label="Importe de la operación" value={importe} onChange={event => setImporte(event.target.value)} required type="number" step="0.01" min="0.01"/></FormField>
          <FormField label="¿Corresponde valor referencial?"><Select aria-label="Corresponde valor referencial" required value={ref} onChange={event => setRef(event.target.value)}>
            <option value="">Seleccione</option><option value="SI">Sí</option><option value="NO">No</option>
          </Select></FormField>
          {ref === 'SI' && <FormField label="Valor referencial en soles"><Input aria-label="Valor referencial en soles" name="referencial" required type="number" step="0.01" min="0.01"/></FormField>}
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <label><input type="checkbox" name="gravado" defaultChecked/> Operación gravada con IGV</label>
          <label><input type="checkbox" name="domiciliado" defaultChecked/> Usuario domiciliado</label>
          <label><input type="checkbox" name="credito" defaultChecked/> El comprobante sustenta crédito fiscal, gasto o costo</label>
          <label><input type="checkbox" name="sectorPublico"/> Usuario del Sector Público Nacional</label>
        </div>
        <Button loading={loading} type="submit">Calcular detracción</Button>
      </form>
    </Card>}
    {result && <Card className="p-4 space-y-2">
      <h2 className="font-semibold text-navy-500">{result.aplica ? 'Estimación sujeta al SPOT' : 'Operación fuera del SPOT según los datos ingresados'}</h2>
      <p className="text-sm">Base {formatMoney(result.base)} · Tasa {result.tasa}% · Monto {formatMoney(result.monto)}</p>
      <p className="text-sm text-slate-600">Estado del depósito pendiente de constancia.</p>
      <Button variant="outline" onClick={() => exportToCSV([{ Ticket: ticket?.numeroTicket || '', Base: result.base, Tasa: result.tasa, Estimación: result.monto }], 'estimacion-detraccion')}>Exportar estimación</Button>
    </Card>}
    <Link href="https://orientacion.sunat.gob.pe/como-se-aplican-las-detracciones-en-el-transporte-de-bienes-por-via-terrestre" target="_blank" rel="noreferrer" className="text-sm text-sky-700 underline">Consultar reglas de SUNAT</Link>
  </div>
}
