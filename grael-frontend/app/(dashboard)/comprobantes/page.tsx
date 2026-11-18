'use client'
import { useEffect, useRef, useState } from 'react'
import { Download, Eye, FileText, Printer, RefreshCw, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { BrandHero } from '@/components/brand/BrandIdentity'
import { Button, Card, FormField, Input, Select } from '@/components/ui'
import TicketFiscalSelector from '@/components/ui/TicketFiscalSelector'
import SerieFiscalForm from '@/components/ui/SerieFiscalForm'
import { comprobantesApi } from '@/lib/api'
import { abrirArchivo, mensajeApi, solicitudUuid } from '@/lib/archivos'
import { COMPROBANTES_DB } from '@/lib/data'
import { hoyPeru } from '@/lib/peru-time'
import { exportToCSV, formatMoney } from '@/lib/utils'
import { useAuthStore } from '@/store'
import type { Ticket } from '@/types'

const states: Record<string, string> = {
  INTERNO: 'Interno', EMITIDO: 'Histórico', SIMULADO: 'Simulado', PENDIENTE_SUNAT: 'En conciliación', ENVIADO_SUNAT: 'Enviado',
  ACEPTADO: 'Aceptado', ACEPTADO_CON_OBSERVACIONES: 'Aceptado con observaciones',
  ACEPTADO_TEST: 'Aceptado en pruebas', RECHAZADO: 'Rechazado', ANULADO: 'Anulado', ANULADO_MOCK: 'Anulado en simulación',
}
const types: Record<string, string> = { FACTURA: 'Factura', BOLETA: 'Boleta', NOTA_CREDITO: 'Nota de crédito' }
const emptySummary = { totalFacturado: 0, totalCobrado: 0, saldoPendiente: 0, totalAnulado: 0, totalRechazado: 0 }
const emptyFilters = { tipo: '', estado: '', q: '', fechaDesde: '', fechaHasta: '' }
const peruTime = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })

type Row = { id: string; tipo: string; serie: string; numero: string; fecha: string; hora: string; cliente: string; rucDni: string; ticketRef: string; subTotal: number; igv: number; total: number; estado: string }

function CpeForm({ onDone }: { onDone: () => void }) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [forma, setForma] = useState('Contado')
  const [referencia, setReferencia] = useState('')
  const [busy, setBusy] = useState(false)
  const request = useRef<{ fingerprint: string; id: string } | null>(null)
  const source = (form: FormData, key: string) => String(form.get(key) || '')

  return <form className="space-y-3" onSubmit={async event => {
    event.preventDefault()
    if (!ticket) return
    const form = new FormData(event.currentTarget)
    const payload = {
      ticketId: ticket.id, tipo: source(form, 'tipo'), serie: source(form, 'serie').toUpperCase(),
      sectorPublico: form.get('sectorPublico') === 'on', formaPago: forma,
      valorReferencialTipo: referencia, valorReferencial: referencia === 'DECLARADO' ? source(form, 'valor') : undefined,
      vencimiento: forma === 'Credito' ? source(form, 'vencimiento') : undefined,
    }
    const fingerprint = JSON.stringify(payload)
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: solicitudUuid() }
    setBusy(true)
    try {
      const { data } = await comprobantesApi.emitir({ ...payload, solicitudId: request.current.id })
      const status = data.respuestaSunat?.mensaje || data.estado.replaceAll('_', ' ')
      toast(`${data.serie}-${data.numero} · ${data.ambiente} · ${status}`)
      onDone()
    } catch (error) { toast.error(mensajeApi(error, 'No se pudo emitir')) }
    finally { setBusy(false) }
  }}>
    <TicketFiscalSelector value={ticket?.id || ''} onSelect={setTicket}/>
    {ticket && <p className="text-sm">Total del ticket <strong>{formatMoney(Number(ticket.total))}</strong></p>}
    <div className="grid sm:grid-cols-3 gap-3">
      <FormField label="Tipo"><Select aria-label="Tipo de comprobante" name="tipo"><option value="01">Factura</option><option value="03">Boleta</option></Select></FormField>
      <FormField label="Serie"><Input aria-label="Serie CPE" name="serie" required minLength={4} maxLength={4}/></FormField>
      <FormField label="Forma de pago"><Select aria-label="Forma de pago" value={forma} onChange={event => setForma(event.target.value)}>
        <option value="Contado">Contado</option><option value="Credito">Crédito, una cuota</option>
      </Select></FormField>
      {forma === 'Credito' && <FormField label="Vencimiento"><Input aria-label="Vencimiento" name="vencimiento" type="date" min={hoyPeru()} required/></FormField>}
      <FormField label="Valor referencial del transporte"><Select aria-label="Valor referencial del transporte" required value={referencia} onChange={event => setReferencia(event.target.value)}>
        <option value="">Seleccione</option><option value="NO_CORRESPONDE">No corresponde</option><option value="DECLARADO">Importe calculado</option>
      </Select></FormField>
      {referencia === 'DECLARADO' && <FormField label="Valor referencial en soles"><Input aria-label="Valor referencial en soles" name="valor" type="number" min="0.01" step="0.01" required/></FormField>}
    </div>
    <label className="flex gap-2 text-xs text-slate-600"><input name="sectorPublico" type="checkbox"/>El cliente pertenece al Sector Público Nacional</label>
    <Button type="submit" loading={busy} disabled={!ticket}>Emitir comprobante</Button>
  </form>
}

export default function ComprobantesPage() {
  const { token, user } = useAuthStore()
  const demo = token?.startsWith('demo-') && process.env.NODE_ENV !== 'production'
  const canEmit = Boolean(user && ['SUPERADMIN','SUPERVISOR','ADMIN_SEDE','CAJERO'].includes(user.rol) && !demo && token)
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState(emptySummary)
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [issuePanel, setIssuePanel] = useState(false)
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState('')

  useEffect(() => {
    if (!token) return
    const abort = new AbortController()
    const timer = window.setTimeout(() => {
      if (demo) {
        setRows(COMPROBANTES_DB.filter(c => (!filters.tipo || c.tipo === filters.tipo)).map(item => ({ ...item, estado: 'SIMULADO' })))
        setLoading(false)
        return
      }
      setLoading(true)
      setFailure('')
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
      comprobantesApi.listar({ ...params, page, limit: 20 }, abort.signal).then(({ data }) => {
        setRows((data.data || []).map((item: any) => ({
          id: item.id, tipo: item.tipo, serie: item.serie, numero: item.numero, fecha: hoyPeru(new Date(item.createdAt)),
          hora: peruTime.format(new Date(item.createdAt)), cliente: item.cliente?.razonSocial || '—',
          rucDni: item.cliente?.ruc || item.cliente?.dni || '—', ticketRef: item.ticket?.numeroTicket || '—',
          subTotal: Number(item.subTotal), igv: Number(item.igv), total: Number(item.total), estado: item.estado,
        })))
        setSummary(data.resumen || emptySummary)
        setPages(Math.max(1, data.totalPages || 1))
      }).catch(error => {
        if (abort.signal.aborted) return
        setRows([])
        setSummary(emptySummary)
        setFailure(mensajeApi(error, 'No se pudieron cargar comprobantes'))
      }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    }, 180)
    return () => { window.clearTimeout(timer); abort.abort() }
  }, [token, demo, filters, page, reload])

  const filter = (name: keyof typeof emptyFilters, value: string) => {
    setFilters(previous => ({ ...previous, [name]: value }))
    setPage(1)
  }
  const refresh = () => { setReload(previous => previous + 1); setSelected(null) }
  const run = async (task: () => Promise<unknown>) => {
    try { await task() } catch (error) { toast.error(mensajeApi(error, 'No se pudo completar la operación')) }
  }
  const pdf = (row: Row, print = false) => run(() => abrirArchivo(() => comprobantesApi.pdf(row.id, print), `comprobante-${row.serie}-${row.numero}.pdf`, print))
  const metrics = [
    ['Total facturado', summary.totalFacturado], ['Total cobrado', summary.totalCobrado], ['Saldo pendiente', summary.saldoPendiente],
    ['Total anulado', summary.totalAnulado], ['Total rechazado', summary.totalRechazado],
  ] as const

  return <div className="space-y-4">
    <BrandHero compact title="Comprobantes" description="Emisión, constancias SUNAT y cobros registrados por ticket." />
    <div className="flex flex-wrap gap-2">
      {canEmit && <Button icon={<FileText size={15}/>} onClick={() => setIssuePanel(!issuePanel)}>{issuePanel ? 'Cerrar emisión' : 'Nuevo comprobante'}</Button>}
      <Button variant="outline" icon={<Download size={14}/>} disabled={!rows.length} onClick={() => exportToCSV(rows.map(row => ({
        Serie: row.serie, Número: row.numero, Tipo: types[row.tipo], Fecha: row.fecha, Estado: states[row.estado] || row.estado,
        Cliente: row.cliente, Ticket: row.ticketRef, Total: row.total,
      })), `comprobantes-pagina-${page}`)}>Exportar página</Button>
    </div>
    {issuePanel && canEmit && <Card className="p-4"><CpeForm onDone={() => { setIssuePanel(false); refresh() }}/></Card>}
    {canEmit && user?.rol === 'SUPERADMIN' && <SerieFiscalForm kind="CPE"/>}
    {!demo && <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
      {metrics.map(([label, value]) => <Card key={label} className="p-3">
        <p className="text-xs text-slate-600">{label}</p><p className="font-bold text-navy-500 text-lg">{formatMoney(value)}</p>
      </Card>)}
    </div>}
    <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <FormField label="Buscar"><Input aria-label="Buscar comprobante" value={filters.q} onChange={event => filter('q', event.target.value)}/></FormField>
      <FormField label="Tipo"><Select aria-label="Filtrar por tipo" value={filters.tipo} onChange={event => filter('tipo', event.target.value)}>
        <option value="">Todos</option>{Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select></FormField>
      <FormField label="Estado"><Select aria-label="Filtrar por estado" value={filters.estado} onChange={event => filter('estado', event.target.value)}>
        <option value="">Todos</option>{Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select></FormField>
      <FormField label="Desde"><Input type="date" aria-label="Desde" value={filters.fechaDesde} onChange={event => filter('fechaDesde', event.target.value)}/></FormField>
      <FormField label="Hasta"><Input type="date" aria-label="Hasta" value={filters.fechaHasta} onChange={event => filter('fechaHasta', event.target.value)}/></FormField>
    </Card>
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr>{['Comprobante','Cliente','Ticket','Fecha','Total','Estado','Acciones'].map(label => <th key={label} className="px-3 py-2 font-semibold">{label}</th>)}</tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t border-slate-100">
            <td className="px-3 py-3"><strong>{row.serie}-{row.numero}</strong><small className="block text-slate-500">{types[row.tipo]}</small></td>
            <td className="px-3 py-3">{row.cliente}</td><td className="px-3 py-3">{row.ticketRef}</td>
            <td className="px-3 py-3 whitespace-nowrap">{row.fecha}</td><td className="px-3 py-3 whitespace-nowrap">{formatMoney(row.total)}</td>
            <td className="px-3 py-3">{states[row.estado] || row.estado}</td>
            <td className="px-3 py-3"><div className="flex gap-1">
              <Button variant="ghost" size="xs" aria-label="Ver comprobante" onClick={() => setSelected(row)}><Eye size={15}/></Button>
              {!demo && <Button variant="ghost" size="xs" aria-label="Descargar PDF" onClick={() => pdf(row)}><Download size={15}/></Button>}
              {!demo && <Button variant="ghost" size="xs" aria-label="Abrir PDF para imprimir" onClick={() => pdf(row, true)}><Printer size={15}/></Button>}
            </div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500" role="status">{loading ? 'Cargando comprobantes…' : failure || 'No se encontraron comprobantes'}</td></tr>}
        </tbody>
      </table>
      <div className="p-3 flex items-center justify-end gap-3 text-xs">
        <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Anterior</Button>
        <span>{page} / {pages}</span>
        <Button variant="outline" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Siguiente</Button>
      </div>
    </Card>
    {selected && <div className="fixed inset-0 bg-slate-900/50 grid place-items-center p-4 z-[60]" role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Detalle de comprobante" className="w-full max-w-lg bg-white rounded-xl shadow-xl p-5 space-y-4">
        <div className="flex justify-between"><h2 className="font-bold text-navy-500">{types[selected.tipo]} {selected.serie}-{selected.numero}</h2>
          <Button variant="ghost" aria-label="Cerrar detalle" onClick={() => setSelected(null)}><X size={16}/></Button></div>
        <div className="space-y-1 text-sm">
          <p>{selected.cliente} · {selected.rucDni}</p><p>Ticket {selected.ticketRef} · {selected.fecha} {selected.hora}</p>
          <p>{states[selected.estado] || selected.estado}</p><p>Subtotal {formatMoney(selected.subTotal)} · IGV {formatMoney(selected.igv)}</p>
          <p className="font-bold">Total {formatMoney(selected.total)}</p>
        </div>
        {!demo && <div className="flex flex-wrap gap-2">
          <Button onClick={() => pdf(selected)}>Descargar PDF</Button>
          <Button variant="outline" onClick={() => pdf(selected, true)}>Abrir PDF para imprimir</Button>
          {['ACEPTADO','ACEPTADO_CON_OBSERVACIONES','ACEPTADO_TEST','RECHAZADO','PENDIENTE_SUNAT','ENVIADO_SUNAT'].includes(selected.estado)
            && <Button variant="outline" onClick={() => run(() => abrirArchivo(() => comprobantesApi.archivoFiscal(selected.id, 'xml'), `${selected.serie}-${selected.numero}.xml`))}>XML</Button>}
          {['ACEPTADO','ACEPTADO_CON_OBSERVACIONES','ACEPTADO_TEST','RECHAZADO'].includes(selected.estado)
            && <Button variant="outline" onClick={() => run(() => abrirArchivo(() => comprobantesApi.archivoFiscal(selected.id, 'cdr'), `CDR-${selected.serie}-${selected.numero}.zip`))}>CDR</Button>}
          {canEmit && ['PENDIENTE_SUNAT','ENVIADO_SUNAT'].includes(selected.estado) && <Button icon={<RefreshCw size={13}/>} variant="outline" onClick={() => run(async () => { await comprobantesApi.consultar(selected.id); refresh() })}>Consultar SUNAT</Button>}
          {selected.estado === 'SIMULADO' && ['SUPERVISOR','SUPERADMIN'].includes(user?.rol || '') && <Button variant="danger" onClick={() => {
            const motivo = window.prompt('Motivo de anulación del comprobante simulado')
            if (motivo?.trim()) void run(async () => { await comprobantesApi.anular(selected.id, motivo.trim()); refresh() })
          }}>Anular simulación</Button>}
        </div>}
      </section>
    </div>}
  </div>
}
