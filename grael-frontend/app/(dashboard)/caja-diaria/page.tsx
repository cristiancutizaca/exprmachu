'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Banknote, Calculator, CreditCard, Download, Lock, Printer, Search, Smartphone, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { Alert, Button, Card, EmptyState, FormField, Input, Modal, MoneyStat, PageHeader, StatCard, Tabs } from '@/components/ui'
import { PAGOS_HOY } from '@/lib/data'
import { cajaApi } from '@/lib/api'
import { exportToCSV, formatMoney, METODO_COLORS } from '@/lib/utils'
import type { PagoCaja } from '@/lib/data'
import { useAuthStore } from '@/store'

type CajaReal = {
  id: string; sedeId: string; estado: string; saldoInicial: number; saldoEsperado: number
  fechaApertura?: string; fechaCierre?: string; observacion?: string
  sede?: { nombre?: string }; usuarioApertura?: { username?: string; nombre?: string }
  resumen?: Record<string, number>
}

const METHOD_ICONS: Record<string, any> = { EFECTIVO: Banknote, TRANSFERENCIA: CreditCard, YAPE: Smartphone, PLIN: Smartphone, TARJETA: Wallet }
const METHOD_BG: Record<string, string> = { EFECTIVO: 'bg-green-100 text-green-700', TRANSFERENCIA: 'bg-blue-100 text-blue-700', YAPE: 'bg-purple-100 text-purple-700', PLIN: 'bg-pink-100 text-pink-700', TARJETA: 'bg-orange-100 text-orange-700' }

function BarMini({ data, height = 80 }: { data: { label: string; value: number; color: string }[]; height?: number }) {
  const max = Math.max(...data.map(item => item.value), 1)
  const width = 100 / Math.max(data.length, 1)
  return <svg width="100%" height={height} className="overflow-visible">{data.map((item, index) => {
    const barHeight = Math.max((item.value / max) * (height - 18), item.value > 0 ? 3 : 0)
    return <g key={item.label}><rect x={`${index * width + 1}%`} y={height - barHeight - 16} width={`${width - 2}%`} height={barHeight} fill={item.color} rx="3" opacity=".85"/><text x={`${index * width + width / 2}%`} y={height - 2} textAnchor="middle" fontSize="9" fill="#888">{item.label}</text></g>
  })}</svg>
}

function PagoRow({ pago, idx }: { pago: PagoCaja; idx: number }) {
  const Icon = METHOD_ICONS[pago.metodoPago] || Wallet
  return <tr className="border-b border-gray-100 hover:bg-gray-50"><td className="px-3 py-3 text-[11px] text-gray-400">{idx + 1}</td><td className="px-3 py-3 text-[11px] font-mono text-gray-500">{pago.hora}</td><td className="px-3 py-3 font-semibold text-[12px] text-navy-500">{pago.ticket}</td><td className="px-3 py-3 text-[11px] text-gray-700">{pago.remitente}</td><td className="px-3 py-3 text-[11px] text-gray-600">{pago.destinatario}</td><td className="px-3 py-3 text-[11px] text-sky-brand">{pago.ruta}</td><td className="px-3 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${METHOD_BG[pago.metodoPago] || 'bg-gray-100 text-gray-600'}`}><Icon size={10}/>{pago.metodoPago}</span></td><td className="px-3 py-3 text-right font-black text-[13px] text-navy-500">{formatMoney(pago.monto)}</td></tr>
}

export default function CajaDiariaPage() {
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user) as any
  const isDemoMode = !token || token.startsWith('demo-')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [pagos, setPagos] = useState<PagoCaja[]>(isDemoMode ? PAGOS_HOY : [])
  const [caja, setCaja] = useState<CajaReal | null>(null)
  const [resumen, setResumen] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'abrir' | 'movimiento' | 'cerrar' | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab] = useState('todos')
  const [saldoInicial, setSaldoInicial] = useState('0')
  const [observacion, setObservacion] = useState('')
  const [tipoMovimiento, setTipoMovimiento] = useState('INGRESO')
  const [montoMovimiento, setMontoMovimiento] = useState('')
  const [concepto, setConcepto] = useState('')
  const [saldoContado, setSaldoContado] = useState('')

  const cargarCaja = useCallback(async () => {
    if (isDemoMode) { setPagos(PAGOS_HOY); return }
    setLoading(true)
    try {
      const [current, daily] = await Promise.all([cajaApi.actual(), cajaApi.delDia({ fecha, page: 1, limit: 100 })])
      const currentCaja = current.data as CajaReal | null
      setCaja(currentCaja)
      setResumen(currentCaja?.resumen || {})
      setPagos((daily.data?.pagos || []).map((p: any) => ({ id: p.id, hora: new Date(p.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }), ticket: p.ticket?.numeroTicket || p.ticketId, remitente: p.ticket?.remitente?.razonSocial || '—', destinatario: p.ticket?.destinatario?.razonSocial || '—', ruta: `${p.ticket?.origen?.nombre || ''} → ${p.ticket?.destino?.nombre || ''}`, metodoPago: p.metodoPago, monto: Number(p.monto || 0), usuario: p.usuario?.username || '—' })))
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo cargar la caja real') }
    finally { setLoading(false) }
  }, [fecha, isDemoMode])

  useEffect(() => { cargarCaja() }, [cargarCaja])

  const submitApertura = async () => {
    if (isDemoMode) { toast('La apertura de caja Demo no persiste'); setModal(null); return }
    if (!user?.sedeId) { toast.error('El usuario no tiene sede operativa'); return }
    try { await cajaApi.abrir({ sedeId: user.sedeId, saldoInicial: Number(saldoInicial || 0), observacion: observacion || undefined }); toast.success('Caja abierta desde API'); setModal(null); await cargarCaja() } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo abrir la caja') }
  }

  const submitMovimiento = async () => {
    if (!caja) return
    try { await cajaApi.movimiento(caja.id, { tipoMovimiento, monto: Number(montoMovimiento), concepto: concepto.trim() }); toast.success('Movimiento registrado'); setModal(null); setMontoMovimiento(''); setConcepto(''); await cargarCaja() } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo registrar el movimiento') }
  }

  const submitCierre = async () => {
    if (!caja) return
    try { const response = await cajaApi.cerrar(caja.id, { saldoDeclarado: Number(saldoContado), observacion: observacion || undefined }); const difference = Number(response.data?.diferencia || 0); toast.success(`Caja cerrada · diferencia ${formatMoney(difference)}`); setModal(null); setSaldoContado(''); setObservacion(''); await cargarCaja() } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo cerrar la caja') }
  }

  const pagosFiltrados = useMemo(() => pagos.filter(p => (tab === 'todos' || p.metodoPago === tab.toUpperCase()) && (!busqueda || `${p.ticket} ${p.remitente} ${p.destinatario}`.toLowerCase().includes(busqueda.toLowerCase()))), [pagos, tab, busqueda])
  const total = pagos.reduce((sum, p) => sum + p.monto, 0)
  const totalFiltrado = pagosFiltrados.reduce((sum, p) => sum + p.monto, 0)
  const methods = ['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'TARJETA']
  const porMetodo = methods.map(method => ({ method, amount: pagos.filter(p => p.metodoPago === method).reduce((sum, p) => sum + p.monto, 0), count: pagos.filter(p => p.metodoPago === method).length, color: METODO_COLORS[method] || '#3b97c8' })).filter(item => item.amount > 0)
  const effectiveTotal = isDemoMode ? total : Number(resumen.totalIngresos || total)
  const expectedCash = isDemoMode ? total : Number(resumen.esperadoEfectivo || caja?.saldoEsperado || 0)
  const tabs = [{ id: 'todos', label: 'Todos' }, ...porMetodo.map(item => ({ id: item.method.toLowerCase(), label: item.method, badge: item.count }))]

  const printCaja = () => {
    const popup = window.open('', '_blank')
    if (!popup) { toast.error('El navegador bloqueó la ventana de impresión'); return }
    const html = `<html lang="es"><head><title>Caja GRAEL</title><style>body{font-family:Arial;max-width:760px;margin:30px auto;color:#172554}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:20px;font-weight:bold}</style></head><body><h1>GRAEL · Caja Diaria</h1><p>Sede: ${caja?.sede?.nombre || user?.sedeId || 'Demo'} · Responsable: ${caja?.usuarioApertura?.username || user?.username || 'Demo'}</p><p>Fecha: ${fecha} · Estado: ${caja?.estado || 'DEMO'}</p><table><tr><th>Concepto</th><th>Monto</th></tr><tr><td>Saldo inicial</td><td>${formatMoney(Number(resumen.saldoInicial || caja?.saldoInicial || 0))}</td></tr><tr><td>Efectivo</td><td>${formatMoney(Number(resumen.efectivo || 0))}</td></tr><tr><td>Total digital</td><td>${formatMoney(Number(resumen.totalDigital || 0))}</td></tr><tr><td>Egresos efectivo</td><td>${formatMoney(Number(resumen.egresosEfectivo || 0))}</td></tr><tr><td>Esperado efectivo</td><td>${formatMoney(expectedCash)}</td></tr></table><p class="total">Total ingresos: ${formatMoney(effectiveTotal)}</p><script>window.onload=()=>window.print()</script></body></html>`
    popup.document.write(html); popup.document.close()
  }

  return <div className="pb-8 space-y-5">
    <PageHeader title="Caja Diaria" subtitle={new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} actions={<div className="flex gap-2"><Button variant="outline" size="sm" icon={<Download size={13}/>} onClick={() => { exportToCSV(pagosFiltrados as any, `caja_${fecha}`); toast.success('CSV exportado desde datos cargados') }}>Exportar</Button><Button variant="secondary" size="sm" icon={<Printer size={13}/>} onClick={printCaja}>Imprimir</Button>{caja ? <><Button variant="outline" size="sm" onClick={() => setModal('movimiento')}>Movimiento</Button><Button variant="dark" size="sm" icon={<Lock size={13}/>} onClick={() => setModal('cerrar')}>Cierre de caja</Button></> : <Button variant="dark" size="sm" icon={<Lock size={13}/>} onClick={() => setModal('abrir')}>Abrir caja</Button>}</div>} />
    <Card><div className="flex flex-wrap items-end gap-3"><FormField label="Fecha"><Input type="date" value={fecha} onChange={event => setFecha(event.target.value)} className="w-[160px]"/></FormField><Button variant="primary" icon={<Search size={13}/>} loading={loading} onClick={cargarCaja}>Ver caja</Button><div className="ml-auto"><Alert variant={caja ? 'success' : 'warning'} className="py-2"><span className="font-bold">{isDemoMode ? 'Caja Demo' : caja ? 'Caja abierta' : 'Sin caja abierta'}</span> — {isDemoMode ? 'datos simulados' : caja ? `sesión ${caja.id.slice(0, 8)}` : 'abra una sesión para cobrar'}</Alert></div></div></Card>
    {caja && <Card><div className="grid grid-cols-2 lg:grid-cols-6 gap-3 text-[11px]"><div><span className="text-gray-400">Sede</span><p className="font-bold">{caja.sede?.nombre || caja.sedeId}</p></div><div><span className="text-gray-400">Responsable</span><p className="font-bold">{caja.usuarioApertura?.username || user?.username || '—'}</p></div><div><span className="text-gray-400">Apertura</span><p className="font-bold">{caja.fechaApertura ? new Date(caja.fechaApertura).toLocaleString('es-PE') : '—'}</p></div><div><span className="text-gray-400">Saldo inicial</span><p className="font-bold">{formatMoney(Number(caja.saldoInicial || 0))}</p></div><div><span className="text-gray-400">Esperado</span><p className="font-bold text-sky-brand">{formatMoney(expectedCash)}</p></div><div><span className="text-gray-400">Estado</span><p className="font-bold text-green-700">{caja.estado}</p></div></div></Card>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><StatCard label="Total ingresos" value={formatMoney(effectiveTotal)} icon={<Calculator size={18} className="text-white"/>} color="bg-navy-500" sub={`${pagos.length} cobros`}/>{methods.slice(0, 3).map(method => { const amount = isDemoMode ? pagos.filter(p => p.metodoPago === method).reduce((s, p) => s + p.monto, 0) : Number(resumen[method.toLowerCase()] || 0); const Icon = METHOD_ICONS[method] || Wallet; return <StatCard key={method} label={method} value={formatMoney(amount)} icon={<Icon size={18} className="text-white"/>} color="bg-sky-brand" sub="API / resumen"/> })}</div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><Card className="lg:col-span-2"><div className="flex justify-between mb-4"><div><p className="text-[13px] font-semibold text-gray-700">Cobros por hora</p><p className="text-[11px] text-gray-400">Distribución del día</p></div><MoneyStat value={effectiveTotal} size="lg"/></div><BarMini data={Array.from({ length: 7 }, (_, i) => ({ label: `${8 + i * 2}:00`, value: pagos.filter(p => Number(p.hora.split(':')[0]) >= 8 + i * 2 && Number(p.hora.split(':')[0]) < 10 + i * 2).reduce((s, p) => s + p.monto, 0), color: '#3b97c8' }))} height={100}/></Card><Card><p className="text-[13px] font-semibold text-gray-700 mb-3">Resumen financiero</p><div className="space-y-2 text-[12px]"><div className="flex justify-between"><span>Efectivo esperado</span><strong>{formatMoney(expectedCash)}</strong></div><div className="flex justify-between"><span>Total digital</span><strong>{formatMoney(Number(resumen.totalDigital || 0))}</strong></div><div className="flex justify-between"><span>Egresos</span><strong>{formatMoney(Number(resumen.totalEgresos || 0))}</strong></div><div className="flex justify-between border-t pt-2"><span>Total ingresos</span><strong>{formatMoney(effectiveTotal)}</strong></div></div></Card></div>
    <Card padding={false} className="overflow-hidden"><div className="px-4 pt-4 pb-3 border-b space-y-3"><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-gray-700">Detalle de cobros</p><span className="text-[11px] bg-navy-50 text-navy-500 px-2 py-0.5 rounded-full font-semibold">{pagosFiltrados.length} registros</span></div><div className="flex flex-wrap items-center gap-3"><Tabs items={tabs} active={tab} onChange={setTab} variant="pills"/><Input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar por ticket, cliente..." className="w-[220px] ml-auto"/></div></div><div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr className="bg-gray-50 border-b border-gray-200">{['#', 'Hora', 'Ticket', 'Remitente', 'Destinatario', 'Ruta', 'Método', 'Monto'].map(header => <th key={header} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">{header}</th>)}</tr></thead><tbody>{pagosFiltrados.length ? pagosFiltrados.map((p, index) => <PagoRow key={p.id} pago={p} idx={index}/>) : <tr><td colSpan={8}><EmptyState icon={<Calculator size={28}/>} title="Sin cobros" subtitle={isDemoMode ? 'No hay operaciones Demo con este filtro' : 'No hay pagos de la sede y fecha consultadas'}/></td></tr>}</tbody></table></div></Card>
    <Modal open={modal === 'abrir'} title="Abrir caja" onClose={() => setModal(null)} footer={<div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancelar</Button><Button variant="dark" className="flex-1" onClick={submitApertura}>Abrir caja</Button></div>}><div className="space-y-3"><FormField label="Saldo inicial"><Input aria-label="Saldo inicial" type="number" min="0" value={saldoInicial} onChange={event => setSaldoInicial(event.target.value)}/></FormField><FormField label="Observación"><Input aria-label="Observación de apertura" value={observacion} onChange={event => setObservacion(event.target.value)} placeholder="Opcional"/></FormField></div></Modal>
    <Modal open={modal === 'movimiento'} title="Registrar movimiento" onClose={() => setModal(null)} footer={<div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancelar</Button><Button variant="dark" className="flex-1" onClick={submitMovimiento}>Guardar</Button></div>}><div className="space-y-3"><FormField label="Tipo"><select className="w-full border rounded-lg p-2 text-sm" value={tipoMovimiento} onChange={event => setTipoMovimiento(event.target.value)}><option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option><option value="AJUSTE">Ajuste autorizado</option></select></FormField><FormField label="Monto"><Input aria-label="Monto" type="number" min="0.01" value={montoMovimiento} onChange={event => setMontoMovimiento(event.target.value)}/></FormField><FormField label="Motivo / concepto"><Input aria-label="Motivo / concepto" value={concepto} onChange={event => setConcepto(event.target.value)} placeholder="Detalle obligatorio"/></FormField></div></Modal>
    <Modal open={modal === 'cerrar'} title="Cierre de caja" onClose={() => setModal(null)} footer={<div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={printCaja} icon={<Printer size={13}/>}>Imprimir</Button><Button variant="dark" className="flex-1" onClick={submitCierre} icon={<Lock size={13}/>}>Cerrar caja</Button></div>}><div className="space-y-3"><Alert variant="info">Esperado efectivo: <strong>{formatMoney(expectedCash)}</strong></Alert><FormField label="Efectivo contado"><Input aria-label="Efectivo contado" type="number" min="0" value={saldoContado} onChange={event => setSaldoContado(event.target.value)} placeholder="Ingrese el efectivo contado"/></FormField><FormField label="Observación"><Input aria-label="Observación de cierre" value={observacion} onChange={event => setObservacion(event.target.value)} placeholder="Obligatoria si existe diferencia"/></FormField></div></Modal>
  </div>
}
