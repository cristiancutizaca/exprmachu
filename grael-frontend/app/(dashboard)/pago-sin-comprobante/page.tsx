'use client'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Banknote, Search, CheckCircle, AlertCircle, Loader2, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, PageHeader, FormField, Input, Select } from '@/components/ui'
import { TICKETS_DB } from '@/lib/data'
import { cajaApi, ticketsApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { formatMoney } from '@/lib/utils'
import type { Ticket } from '@/types'

const schema = z.object({
  numeroTicket:  z.string().min(1, 'Requerido'),
  metodoPago:    z.enum(['EFECTIVO','TRANSFERENCIA','YAPE','PLIN','TARJETA']),
  monto:         z.number().min(0.01, 'Ingrese el monto'),
  referencia:    z.string().optional(),
  observacion:   z.string().optional(),
})
type Form = z.infer<typeof schema>

const PAGOS_RAPIDOS = [
  { id:'pr1', hora:'14:30', ticket:'301-0631200', cliente:'JORGE QUISPE MAMANI', monto:1038.40, metodo:'EFECTIVO' },
  { id:'pr2', hora:'16:20', ticket:'301-0631115', cliente:'AGRO EXPORTACIONES PUNO', monto:12980, metodo:'TRANSFERENCIA' },
]

export default function PagoSinComprobantePage() {
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [busqNum, setBusqNum] = useState('')
  const [busqLoading, setBusqLoading] = useState(false)
  const [ticketEncontrado, setTicket] = useState<Ticket | null>(null)
  const [ticketError, setTicketError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pagosHoy, setPagosHoy] = useState<any[]>([])

  const cargarPagos = useCallback(async () => {
    if (isDemoMode) { setPagosHoy(PAGOS_RAPIDOS); return }
    try {
      const response = await cajaApi.delDia()
      setPagosHoy((response.data?.pagos || []).map((pago: any) => ({ id: pago.id, hora: new Date(pago.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }), ticket: pago.ticket?.numeroTicket || '—', cliente: pago.ticket?.remitente?.razonSocial || 'Cliente', monto: Number(pago.monto || 0), metodo: pago.metodoPago })))
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudieron cargar los pagos reales') }
  }, [isDemoMode])

  useEffect(() => { void cargarPagos() }, [cargarPagos])

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<Form>({
      resolver: zodResolver(schema),
      defaultValues: { metodoPago: 'EFECTIVO', monto: 0 },
    })

  const metodoPago = watch('metodoPago')

  const buscarTicket = async () => {
    if (!busqNum.trim()) return
    setBusqLoading(true); setTicketError(''); setTicket(null)
    try {
      const t = isDemoMode
        ? TICKETS_DB.find(item => item.numeroTicket === busqNum.trim() || item.numeroTicket.includes(busqNum.trim()))
        : (await ticketsApi.buscar({ numeroTicket: busqNum.trim() }, 1, 10)).data.data?.[0]
      if (!t) { setTicketError('Ticket no encontrado'); return }
      if (t.anulado || t.pagado) { setTicketError(t.anulado ? 'El ticket está anulado' : 'El ticket ya fue pagado'); return }
      setTicket(t as Ticket)
      setValue('numeroTicket', t.numeroTicket)
      setValue('monto', Number(t.total))
      toast.success(isDemoMode ? 'Demo: ticket encontrado' : 'Ticket encontrado en el API')
    } catch (error: any) {
      setTicketError(error.response?.data?.message || 'No se pudo buscar el ticket')
    } finally { setBusqLoading(false) }
  }

  const onSubmit = async (data: Form) => {
    setSaving(true)
    try {
      if (isDemoMode) {
        setPagosHoy(prev => [{ id: `demo-pago-${prev.length + 1}`, hora: new Date().toTimeString().slice(0,5), ticket: data.numeroTicket, cliente: ticketEncontrado?.remitente.razonSocial || 'Cliente', monto: data.monto, metodo: data.metodoPago }, ...prev])
        toast.success(`Demo: pago local simulado — ${data.metodoPago} — ${formatMoney(data.monto)}`)
      } else {
        if (!ticketEncontrado?.id) throw new Error('El ticket real no tiene identificador')
        await ticketsApi.registrarPago(ticketEncontrado.id, data.metodoPago, data.monto)
        await cargarPagos()
        toast.success(`Pago registrado — ${data.metodoPago} — ${formatMoney(data.monto)}`)
      }
      reset({ metodoPago:'EFECTIVO', monto:0 })
      setTicket(null); setBusqNum('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'No se pudo registrar el pago')
    } finally { setSaving(false) }
  }

  const METODOS = [
    { value:'EFECTIVO',      label:'💵 Efectivo',       color:'text-green-600' },
    { value:'TRANSFERENCIA', label:'🏦 Transferencia',  color:'text-blue-600'  },
    { value:'YAPE',          label:'📱 Yape',           color:'text-purple-600'},
    { value:'PLIN',          label:'📱 Plin',           color:'text-pink-600'  },
    { value:'TARJETA',       label:'💳 Tarjeta',        color:'text-orange-600'},
  ]

  return (
    <div className="pb-6">
      <PageHeader title="Pago sin Comprobante" subtitle={isDemoMode ? 'Modo Demo — operaciones locales' : 'Sesión real — pago financiero por API y caja'} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Formulario de pago */}
        <div className="space-y-4">
          {/* Buscar ticket */}
          <Card>
            <p className="text-[13px] font-semibold text-gray-700 mb-3 pb-2 border-b">Buscar ticket a pagar</p>
            <div className="flex gap-2">
              <Input
                value={busqNum}
                onChange={e => setBusqNum(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarTicket()}
                placeholder="N° de ticket, ej: 301-0631143"
                className="flex-1"
              />
              <Button variant="primary" loading={busqLoading} icon={<Search size={13}/>}
                onClick={buscarTicket}>
                Buscar
              </Button>
            </div>

            {ticketError && (
              <div className="mt-3 flex items-center gap-2 text-red-600 text-[12px] bg-red-50 p-2.5 rounded-lg">
                <AlertCircle size={14}/> {ticketError}
              </div>
            )}

            {ticketEncontrado && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium">Ticket encontrado</p>
                    <p className="text-[14px] font-black text-navy-500">{ticketEncontrado.numeroTicket}</p>
                    <p className="text-[11px] text-gray-600">{ticketEncontrado.remitente.razonSocial}</p>
                    <p className="text-[11px] text-gray-400">{ticketEncontrado.origen.nombre} → {ticketEncontrado.destino.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400">Total a cobrar</p>
                    <p className="text-[18px] font-black text-navy-500">{formatMoney(ticketEncontrado.total)}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Formulario de pago */}
          <Card>
            <p className="text-[13px] font-semibold text-gray-700 mb-3 pb-2 border-b">Registrar pago</p>
            <input type="hidden" {...register('numeroTicket')}/>

            {/* Método de pago */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {METODOS.map(m => (
                <button key={m.value} type="button"
                  onClick={() => setValue('metodoPago', m.value as any)}
                  className={`p-3 rounded-lg border-2 text-center text-[12px] font-medium transition-all ${
                    metodoPago === m.value
                      ? 'border-sky-brand bg-sky-brand/5 text-navy-500'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <FormField label="Monto (S/)" error={errors.monto?.message}>
                <Input type="number" step="0.01" min="0"
                  {...register('monto', { valueAsNumber: true })}
                  className="text-[16px] font-bold py-3"/>
              </FormField>

              {(metodoPago === 'TRANSFERENCIA' || metodoPago === 'TARJETA') && (
                <FormField label="N° de operación / referencia">
                  <Input {...register('referencia')} placeholder="Número de transferencia..."/>
                </FormField>
              )}

              <FormField label="Observación (opcional)">
                <Input {...register('observacion')} placeholder="Nota adicional..."/>
              </FormField>

              <Button
                variant="success"
                className="w-full py-3 text-[14px]"
                loading={saving}
                icon={<CheckCircle size={15}/>}
                onClick={handleSubmit(onSubmit)}
                disabled={!ticketEncontrado}>
                Confirmar pago {watch('monto') > 0 ? `— ${formatMoney(watch('monto'))}` : ''}
              </Button>

              {!ticketEncontrado && (
                <p className="text-[11px] text-gray-400 text-center">
                  Primero busque y seleccione un ticket
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Pagos del día */}
        <div>
          <Card padding={false} className="overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Receipt size={14} className="text-gray-400"/>
              <p className="text-[13px] font-semibold text-gray-700">Pagos del día</p>
              <span className="ml-auto text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {pagosHoy.length} cobros
              </span>
            </div>
            {pagosHoy.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Banknote size={28} className="mx-auto mb-2 text-gray-200"/>
                <p className="text-[12px]">Sin pagos registrados hoy</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pagosHoy.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    <div className="text-[11px] font-mono text-gray-400 flex-shrink-0 w-10">{p.hora}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-navy-500">{p.ticket}</p>
                      <p className="text-[11px] text-gray-500 truncate">{p.cliente}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] font-bold text-gray-800">{formatMoney(p.monto)}</p>
                      <p className="text-[10px] text-gray-400">{p.metodo}</p>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-3 bg-navy-500 flex justify-between">
                  <span className="text-white text-[12px] font-medium">TOTAL COBRADO</span>
                  <span className="text-white text-[14px] font-black">
                    {formatMoney(pagosHoy.reduce((s,p)=>s+p.monto,0))}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
