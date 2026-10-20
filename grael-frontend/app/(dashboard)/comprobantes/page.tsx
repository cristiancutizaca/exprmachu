'use client'
import { useCallback, useEffect, useState } from 'react'
import { FileText, Download, Search, Eye, X, Printer, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, PageHeader, FormField, Input, Select, Badge } from '@/components/ui'
import { COMPROBANTES_DB } from '@/lib/data'
import { comprobantesApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import type { Comprobante, TipoComprobante } from '@/lib/data'

const TIPO_STYLE: Record<TipoComprobante, { label:string; bg:string; text:string }> = {
  BOLETA:       { label:'Boleta',       bg:'bg-blue-100',   text:'text-blue-700'   },
  FACTURA:      { label:'Factura',      bg:'bg-purple-100', text:'text-purple-700' },
  NOTA_CREDITO: { label:'Nota Crédito', bg:'bg-orange-100', text:'text-orange-700' },
}

// ─── Modal Detalle Comprobante ────────────────────────────────────────────────
function ModalComprobante({ comp, onClose, onDownload, onPrint }: { comp: Comprobante; onClose: ()=>void; onDownload: ()=>void; onPrint: ()=>void }) {
  const tp = TIPO_STYLE[comp.tipo]
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header tipo recibo */}
        <div className="bg-navy-500 text-white rounded-t-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[28px] font-black italic tracking-widest">
                GR<span className="text-sky-light">AE</span>L›
              </div>
              <p className="text-white/60 text-[11px]">Sistema de Gestión Logística</p>
              <p className="text-white/60 text-[11px]">Sede CUSCO — RUC 20601234567</p>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${tp.bg} ${tp.text}`}>
                {tp.label}
              </span>
              <p className="text-white font-bold text-[18px] mt-2">
                {comp.serie}-{comp.numero}
              </p>
              <p className="text-white/70 text-[11px]">{comp.fecha} {comp.hora}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Cliente */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
              {comp.tipo === 'FACTURA' ? 'Empresa / RUC' : 'Cliente / DNI'}
            </p>
            <p className="text-[13px] font-bold text-gray-800">{comp.cliente}</p>
            <p className="text-[11px] text-gray-500">
              {comp.tipo === 'FACTURA' ? 'RUC' : 'DNI'}: {comp.rucDni}
            </p>
            <p className="text-[11px] text-gray-500">Ref. Ticket: <strong>{comp.ticketRef}</strong></p>
          </div>

          {/* Detalle */}
          <table className="w-full border-collapse text-[12px]">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Descripción</td>
                <td className="py-2 text-right font-medium">Servicio de Transporte de Carga</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Sub Total</td>
                <td className="py-2 text-right">S/ {comp.subTotal.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">IGV (18%)</td>
                <td className="py-2 text-right">S/ {comp.igv.toFixed(2)}</td>
              </tr>
              <tr className="bg-navy-50">
                <td className="py-2.5 px-2 font-bold text-navy-500">TOTAL</td>
                <td className="py-2.5 px-2 text-right font-black text-[16px] text-navy-500">
                  S/ {comp.total.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Estado */}
          <div className="flex items-center gap-2">
            {comp.estado === 'EMITIDO'
              ? <><CheckCircle size={16} className="text-green-500"/><span className="text-[12px] text-green-600 font-medium">Comprobante Emitido</span></>
              : <><XCircle    size={16} className="text-red-500"/><span className="text-[12px] text-red-600 font-medium">Anulado</span></>
            }
          </div>
        </div>

        <div className="p-4 border-t flex gap-2">
          <Button variant="primary" size="sm" icon={<Download size={13}/>}
            onClick={onDownload} className="flex-1">
            Descargar representación
          </Button>
          <Button variant="outline" size="sm" icon={<Printer size={13}/>}
            onClick={onPrint} className="flex-1">
            Imprimir
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────
export default function ComprobantesPage() {
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [comps, setComps] = useState<Comprobante[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filtroTipo,   setFiltroTipo]   = useState<string>('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [filtroQ,      setFiltroQ]      = useState('')
  const [detalle, setDetalle]           = useState<Comprobante | null>(null)

  const cargarComprobantes = useCallback(async (requestedPage = 1) => {
    if (isDemoMode) { setComps(COMPROBANTES_DB); setPage(1); setTotalPages(1); return }
    setLoading(true)
    try {
      const response = await comprobantesApi.listar({ tipo: filtroTipo || undefined, estado: filtroEstado || undefined, q: filtroQ || undefined, page: requestedPage, limit: 20 })
      const rows = response.data?.data || []
      setComps(rows.map((c: any) => ({
        id: c.id, tipo: c.tipo, serie: c.serie, numero: c.numero, fecha: new Date(c.createdAt).toISOString().slice(0, 10), hora: new Date(c.createdAt).toLocaleTimeString('es-PE'),
        cliente: c.cliente?.razonSocial || '—', rucDni: c.cliente?.ruc || c.cliente?.dni || '—', ticketRef: c.ticket?.numeroTicket || '—', subTotal: Number(c.subTotal || 0), igv: Number(c.igv || 0), total: Number(c.total || 0), estado: c.estado,
      })))
      setPage(response.data?.page || requestedPage)
      setTotalPages(response.data?.totalPages || response.data?.pages || 1)
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudieron cargar comprobantes reales') }
    finally { setLoading(false) }
  }, [isDemoMode, filtroTipo, filtroEstado, filtroQ])

  // La carga inicial depende solo del modo; las búsquedas se disparan con el botón Buscar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarComprobantes(1) }, [isDemoMode])

  const filtrados = comps

  const totalEmitidos = comps.filter(c=>c.estado==='EMITIDO'&&c.total>0).reduce((s,c)=>s+c.total,0)
  const boletas   = comps.filter(c=>c.tipo==='BOLETA').length
  const facturas  = comps.filter(c=>c.tipo==='FACTURA').length
  const notas     = comps.filter(c=>c.tipo==='NOTA_CREDITO').length

  const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char] || char))
  const representation = (comp: Comprobante) => `<!doctype html><html lang="es"><meta charset="utf-8"><title>${escapeHtml(comp.serie)}-${escapeHtml(comp.numero)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1c3a5c}h1{font-size:20px}table{width:100%;border-collapse:collapse}td{padding:8px;border-bottom:1px solid #ddd}td:last-child{text-align:right;font-weight:bold}</style><h1>GRAEL — ${escapeHtml(TIPO_STYLE[comp.tipo]?.label || comp.tipo)}</h1><p>Comprobante: <strong>${escapeHtml(comp.serie)}-${escapeHtml(comp.numero)}</strong></p><p>Cliente: ${escapeHtml(comp.cliente)} · ${escapeHtml(comp.rucDni)}</p><p>Ticket: ${escapeHtml(comp.ticketRef)} · Fecha: ${escapeHtml(comp.fecha)} ${escapeHtml(comp.hora)}</p><table><tr><td>Servicio de Transporte de Carga</td><td>S/ ${comp.total.toFixed(2)}</td></tr><tr><td>Sub total</td><td>S/ ${comp.subTotal.toFixed(2)}</td></tr><tr><td>IGV</td><td>S/ ${comp.igv.toFixed(2)}</td></tr><tr><td>Total</td><td>S/ ${comp.total.toFixed(2)}</td></tr></table><p>Estado: ${escapeHtml(comp.estado)}</p></html>`
  const downloadRepresentation = (comp: Comprobante) => {
    const blob = new Blob([representation(comp)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `comprobante-${comp.serie}-${comp.numero}.html`; anchor.click(); URL.revokeObjectURL(url)
  }
  const printRepresentation = (comp: Comprobante) => {
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) { toast.error('El navegador bloqueó la ventana de impresión'); return }
    win.document.write(representation(comp)); win.document.close(); win.focus(); win.print()
  }
  const downloadCsv = () => {
    const safeCsv = (value: unknown) => { const text = String(value ?? ''); return /^[=+\-@]/.test(text) ? `'${text}` : text }
    const rows = [['Tipo','Serie','Número','Fecha','Cliente','Ticket','SubTotal','IGV','Total','Estado'], ...comps.map(c => [c.tipo,c.serie,c.numero,c.fecha,c.cliente,c.ticketRef,c.subTotal,c.igv,c.total,c.estado])]
    const csv = rows.map(row => row.map(value => `"${safeCsv(value).replace(/"/g, '""')}"`).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob([`\\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `comprobantes-${page}.csv`; anchor.click(); URL.revokeObjectURL(url)
  }
  const printReport = () => window.print()
  const anular = async (comp: Comprobante) => {
    if (isDemoMode) { toast.success('Demo: anulación simulada; no se escribió PostgreSQL'); return }
    const motivo = window.prompt('Ingrese el motivo de anulación (mínimo 3 caracteres):', '')?.trim() || ''
    if (motivo.length < 3) { toast.error('La anulación requiere un motivo de al menos 3 caracteres'); return }
    try { await comprobantesApi.anular(comp.id, motivo); toast.success('Comprobante anulado localmente (MOCK)'); await cargarComprobantes(page) }
    catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo anular el comprobante') }
  }

  return (
    <div className="pb-6">
      <PageHeader
        title="Comprobantes"
        subtitle={isDemoMode ? 'Modo Demo — datos locales' : 'Sesión real — datos del API'}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<Download size={13}/>}
              onClick={downloadCsv}>CSV página</Button>
            <Button variant="secondary" size="sm" icon={<Printer size={13}/>}
              onClick={printReport}>Imprimir reporte</Button>
          </>
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label:'Total Cobrado',  value:`S/ ${totalEmitidos.toFixed(2)}`, color:'text-navy-500' },
          { label:'Boletas',        value:boletas,   color:'text-blue-600'   },
          { label:'Facturas',       value:facturas,  color:'text-purple-600' },
          { label:'Notas Crédito',  value:notas,     color:'text-orange-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <p className="text-[11px] text-gray-400 mb-1">{label}</p>
            <p className={`text-[20px] font-black ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-2.5 items-end">
          <FormField label="Buscar" className="flex-1 min-w-[200px]">
            <Input value={filtroQ} onChange={e=>setFiltroQ(e.target.value)}
              placeholder="Cliente, RUC, DNI, N° ticket, serie/número..."/>
          </FormField>
          <FormField label="Tipo" className="w-[150px]">
            <Select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="BOLETA">Boleta</option>
              <option value="FACTURA">Factura</option>
              <option value="NOTA_CREDITO">Nota de Crédito</option>
            </Select>
          </FormField>
          <FormField label="Estado" className="w-[130px]">
            <Select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="EMITIDO">Emitido</option>
              <option value="ANULADO">Anulado</option>
            </Select>
          </FormField>
          <FormField label="Fecha Inicio" className="w-[140px]">
            <Input type="date" defaultValue="2026-02-01"/>
          </FormField>
          <FormField label="Fecha Fin" className="w-[140px]">
            <Input type="date" defaultValue="2026-02-28"/>
          </FormField>
          <Button variant="primary" icon={<Search size={13}/>} loading={loading} onClick={() => void cargarComprobantes(1)}>Buscar</Button>
        </div>
      </Card>

      {/* Tabla */}
      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                {['Tipo','Serie-Número','Fecha','Cliente','Ref. Ticket','Sub Total','IGV','Total','Estado',''].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={10} className="py-16 text-center text-gray-400">
                  <FileText size={32} className="mx-auto mb-2 text-gray-200"/>
                  <p className="text-[13px]">No se encontraron comprobantes</p>
                </td></tr>
              ) : filtrados.map(c => {
                const tp = TIPO_STYLE[c.tipo]
                return (
                  <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors
                    ${['ANULADO','ANULADO_MOCK'].includes(c.estado) ? 'opacity-60 line-through-cell' : ''}`}>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tp.bg} ${tp.text}`}>
                        {tp.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[12px] font-bold text-navy-500 font-mono">
                        {c.serie}-{c.numero}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-gray-600 whitespace-nowrap">
                      <p>{c.fecha}</p>
                      <p className="text-gray-400">{c.hora}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[12px] font-medium text-gray-700 max-w-[180px] truncate">{c.cliente}</p>
                      <p className="text-[10px] text-gray-400">{c.rucDni}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[11px] text-sky-brand font-medium">{c.ticketRef}</span>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-gray-700 whitespace-nowrap">
                      S/ {c.subTotal.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-gray-700 whitespace-nowrap">
                      S/ {c.igv.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-[13px] font-bold ${c.total < 0 ? 'text-red-600' : 'text-navy-500'}`}>
                        S/ {c.total.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {c.estado === 'EMITIDO'
                        ? <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
                            <CheckCircle size={12}/>Emitido
                          </span>
                        : <span className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                            <XCircle size={12}/>Anulado ({(c.estado as string) === 'ANULADO_MOCK' ? 'MOCK' : 'local'})
                          </span>
                      }
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => setDetalle(c)}
                          className="w-7 h-7 bg-sky-brand text-white rounded flex items-center justify-center hover:bg-sky-dark transition-colors"
                          title="Ver detalle">
                          <Eye size={12}/>
                        </button>
                        <button onClick={() => downloadRepresentation(c)}
                          className="w-7 h-7 bg-gray-600 text-white rounded flex items-center justify-center hover:bg-gray-700 transition-colors"
                          title="Descargar representación imprimible">
                          <Download size={12}/>
                        </button>
                        {c.estado === 'EMITIDO' && <button onClick={() => void anular(c)}
                          className="w-7 h-7 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600 transition-colors"
                          title="Anular comprobante">
                          <X size={12}/>
                        </button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {filtrados.length > 0 && (
              <tfoot>
                <tr className="bg-navy-500 text-white">
                  <td colSpan={5} className="px-3 py-3 text-right text-[12px] font-semibold">
                    TOTALES ({filtrados.length} comprobantes):
                  </td>
                  <td className="px-3 py-3 text-[12px] font-semibold">
                    S/ {filtrados.reduce((s,c)=>s+c.subTotal,0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-[12px] font-semibold">
                    S/ {filtrados.reduce((s,c)=>s+c.igv,0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-[14px] font-black">
                    S/ {filtrados.reduce((s,c)=>s+c.total,0).toFixed(2)}
                  </td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-[11px] text-gray-500">{filtrados.length} comprobante(s)</span>
          <div className="flex items-center gap-1.5">
            <button disabled={page <= 1} onClick={() => void cargarComprobantes(page - 1)} className="w-7 h-7 border border-gray-200 rounded flex items-center justify-center text-gray-400 disabled:opacity-40">
              <ChevronLeft size={13}/>
            </button>
            <span className="min-w-7 text-center text-[11px] font-medium">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => void cargarComprobantes(page + 1)} className="w-7 h-7 border border-gray-200 rounded flex items-center justify-center text-gray-400 disabled:opacity-40">
              <ChevronRight size={13}/>
            </button>
          </div>
        </div>
      </Card>

      {detalle && <ModalComprobante comp={detalle} onClose={() => setDetalle(null)} onDownload={() => downloadRepresentation(detalle)} onPrint={() => printRepresentation(detalle)}/>}
    </div>
  )
}
