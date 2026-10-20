'use client'
import { useState } from 'react'
import { QrCode, Search, CheckCircle, Package, Truck, Ship, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, PageHeader, FormField, Input, Badge } from '@/components/ui'
import { TICKETS_DB } from '@/lib/data'
import { bultosApi, ticketsApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { formatMoney, ESTADO_COLORS, formatDateTime } from '@/lib/utils'
import type { Ticket } from '@/types'

export default function BusquedaQRPage() {
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [qrInput, setQrInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [resultado, setResultado] = useState<Ticket | null | 'notfound'>(null)

  const buscar = async (valor?: string) => {
    const q = (valor || qrInput).trim()
    if (!q) return
    setSearching(true)
    const qrParts = q.split('|')
    const numBusqueda = qrParts.length >= 2 ? qrParts[1] : q
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 300))
        const ticket = TICKETS_DB.find(t => t.numeroTicket === numBusqueda || t.numeroTicket.includes(numBusqueda) || t.id === numBusqueda)
        setResultado(ticket || 'notfound')
        if (!ticket) toast.error('Ticket no encontrado')
      } else {
        const bultoResponse = await bultosApi.listar({ codigo: q, page: 1, limit: 1 })
        const bulto: any = bultoResponse.data?.data?.[0]
        let ticketFound = false
        const partialTicket: any = bulto?.ticket
        const hasTicketRelations = Boolean(partialTicket?.origen && partialTicket?.destino && partialTicket?.remitente && partialTicket?.destinatario)
        if (hasTicketRelations) {
          const detailResponse = await ticketsApi.getById(partialTicket.id)
          ticketFound = Boolean(detailResponse.data?.id)
          setResultado(ticketFound ? { ...detailResponse.data, bultos: [bulto] } as Ticket : 'notfound')
        } else {
          const ticketResponse = await ticketsApi.buscar({ numeroTicket: numBusqueda } as any, 1, 1)
          ticketFound = Boolean(ticketResponse.data?.data?.[0])
          setResultado(ticketResponse.data?.data?.[0] || 'notfound')
        }
        if (!ticketFound) toast.error('Bulto o ticket no encontrado')
      }
    } catch (error: any) {
      setResultado('notfound')
      toast.error(error.response?.data?.message || 'Error de conexión al buscar en el API')
    } finally { setSearching(false) }
  }

  const estadoIcon: Record<string, any> = {
    PENDIENTE:              Package,
    EN_TRANSITO:            Truck,
    DESEMBARQUE_EN_DESTINO: Ship,
    ENTREGADO:              CheckCircle,
    ANULADO:                AlertCircle,
  }

  const t = resultado && resultado !== 'notfound' ? resultado : null

  const registrarPago = async () => {
    if (!t) return
    if (isDemoMode) { toast.success('Pago aplicado en modo Demo'); setResultado({ ...t, pagado: true }); return }
    try {
      const response = await ticketsApi.registrarPago(t.id)
      setResultado(response.data)
      toast.success('Pago registrado')
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo registrar el pago') }
  }

  const imprimirTicket = async () => {
    if (!t) return
    if (isDemoMode) { toast('Impresión disponible en modo Demo'); return }
    try {
      const response = await ticketsApi.imprimirTicket(t.id)
      const url = URL.createObjectURL(response.data)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo preparar la impresión') }
  }

  const verQR = async () => {
    if (!t) return
    if (isDemoMode) { toast('QR disponible en modo Demo'); return }
    const popup = window.open('about:blank', '_blank')
    try {
      const response = await ticketsApi.getQR(t.id)
      if (popup) popup.location.href = response.data.qrUrl
      else window.location.href = response.data.qrUrl
    } catch (error: any) { popup?.close(); toast.error(error.response?.data?.message || 'No se pudo obtener el QR') }
  }

  return (
    <div className="pb-6 max-w-2xl mx-auto">
          <PageHeader title="Búsqueda por QR" subtitle={isDemoMode ? 'Modo Demo — datos locales' : 'Sesión real — búsqueda de bultos/tickets en API'}/>

      {/* Scanner manual */}
      <Card className="mb-6">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-navy-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <QrCode size={40} className="text-navy-500"/>
          </div>
          <p className="text-[14px] font-semibold text-gray-700">Escanear código QR</p>
          <p className="text-[12px] text-gray-400 mt-1">
            Apunte la cámara al código QR del ticket, o ingrese el número manualmente
          </p>
        </div>

        <FormField label="Número de ticket o código QR">
          <div className="flex gap-2">
            <Input
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              placeholder="301-0631143 o escanear QR..."
              className="flex-1 text-[14px] py-3"
              autoFocus
            />
            <Button variant="primary" loading={searching} icon={<Search size={13}/>}
              onClick={() => buscar()} className="px-5">
              Buscar
            </Button>
          </div>
        </FormField>

        {/* Accesos rápidos */}
        {isDemoMode && <div className="mt-4 pt-4 border-t">
          <p className="text-[11px] text-gray-400 mb-2">Tickets recientes para probar:</p>
          <div className="flex flex-wrap gap-2">
            {TICKETS_DB.slice(0,4).map(t => (
              <button key={t.id}
                onClick={() => { setQrInput(t.numeroTicket); buscar(t.numeroTicket) }}
                className="px-3 py-1.5 text-[11px] bg-gray-100 text-gray-600 rounded-full hover:bg-navy-50 hover:text-navy-500 transition-colors font-mono">
                {t.numeroTicket}
              </button>
            ))}
          </div>
        </div>}
      </Card>

      {/* Resultado - no encontrado */}
      {resultado === 'notfound' && (
        <Card className="text-center py-10">
          <AlertCircle size={32} className="mx-auto mb-3 text-red-400"/>
          <p className="text-[14px] font-semibold text-gray-700">Ticket no encontrado</p>
          <p className="text-[12px] text-gray-400 mt-1">Verifique el número e intente nuevamente</p>
        </Card>
      )}

      {/* Resultado - encontrado */}
      {t && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {/* Header resultado */}
          <div className={`rounded-xl p-5 ${ESTADO_COLORS[t.estado]?.bg || 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Ticket encontrado</p>
                <p className="text-[22px] font-black text-navy-500">{t.numeroTicket}</p>
              </div>
              <div className="text-right">
                {(() => { const Icon = estadoIcon[t.estado] || Package; return <Icon size={32} className={ESTADO_COLORS[t.estado]?.text || 'text-gray-500'}/> })()}
                <span className={`block text-[11px] font-bold mt-1 ${ESTADO_COLORS[t.estado]?.text || 'text-gray-600'}`}>
                  {ESTADO_COLORS[t.estado]?.label || t.estado}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[12px]">
              <span className="font-semibold text-sky-brand">{t.origen.nombre}</span>
              <span className="text-gray-400">→</span>
              <span className="font-semibold text-sky-brand">{t.destino.nombre}</span>
              <span className="ml-auto">
                <Badge label={t.tipoEntrega} variant={t.tipoEntrega==='AGENCIA'?'agencia':'reparto'}/>
              </span>
            </div>
          </div>

          {/* Remitente / Destinatario */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Remitente',    data:t.remitente },
              { label:'Destinatario', data:t.destinatario },
            ].map(({label,data})=>(
              <Card key={label}>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">{label}</p>
                <p className="text-[12px] font-semibold text-gray-800">{data.razonSocial}</p>
                <p className="text-[11px] text-gray-500">{data.tipo==='JURIDICO'?`RUC: ${data.ruc}`:`DNI: ${data.dni}`}</p>
                {data.telefono && <p className="text-[11px] text-sky-brand">{data.telefono}</p>}
              </Card>
            ))}
          </div>

          {/* Mercadería */}
          <Card>
            <p className="text-[12px] font-semibold text-gray-600 mb-2.5">Mercadería</p>
            {t.mercaderias.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-[12px] font-medium text-gray-700">{m.tipo}</p>
                  <p className="text-[11px] text-gray-400">{m.descripcion || '—'}</p>
                  <p className="text-[10px] text-gray-400">{m.pesoTotal}kg × {m.cantidad} unid.</p>
                </div>
                <p className="text-[12px] font-bold text-navy-500">{formatMoney(m.total)}</p>
              </div>
            ))}
          </Card>

          {/* Totales y estado de pago */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-500">Subtotal: {formatMoney(t.subTotal)}</p>
                <p className="text-[11px] text-gray-500">IGV (18%): {formatMoney(t.igv)}</p>
                <p className="text-[16px] font-black text-navy-500 mt-1">TOTAL: {formatMoney(t.total)}</p>
              </div>
              <div className="text-right">
                <Badge
                  label={t.pagado ? 'PAGADO' : 'NO PAGADO'}
                  variant={t.pagado ? 'pagado' : 'nopagado'}
                  className="text-[12px] px-3 py-1"
                />
                <p className="text-[10px] text-gray-400 mt-1">Fecha: {t.fechaEmision.split(' ')[0]}</p>
                <p className="text-[10px] text-gray-400">Usuario: {t.usuarioCreacion}</p>
              </div>
            </div>
          </Card>

          {/* Acciones */}
          <div className="flex gap-2 flex-wrap">
            {!t.pagado && !t.anulado && (
              <Button variant="success" icon={<CheckCircle size={13}/>} onClick={registrarPago}>
                Registrar pago
              </Button>
            )}
            <Button variant="outline" icon={<QrCode size={13}/>} onClick={verQR}>
              Ver QR
            </Button>
            <Button variant="outline" icon={<Package size={13}/>} onClick={imprimirTicket}>
              Imprimir ticket
            </Button>
            <Button variant="ghost" onClick={() => { setResultado(null); setQrInput('') }}>
              Nueva búsqueda
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
