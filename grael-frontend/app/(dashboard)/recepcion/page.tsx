'use client'
import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  Search, Plus, Printer, Banknote, QrCode, Settings,
  Ticket, Save, X, Trash2, Loader2, User, Building2,
  RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useAuthStore, useRecepcionStore } from '@/store'
import {
  Button, Card, PageHeader, SectionTitle,
  FormField, Input, Select, Toggle, RadioGroup, Badge,
} from '@/components/ui'
import FloatBar from '@/components/layout/FloatBar'
import {
  consultarRENIEC, consultarSUNAT,
  DESTINOS_LIST, TIPOS_MERCADERIA, PROGRAMACIONES,
  calcularMontos, nextNumeroTicket, TICKETS_DB, COSTO_KG_DEFAULT,
} from '@/lib/data'
import type { TipoPago, TipoEntrega, Ticket as TicketType, Destino, Cliente } from '@/types'
import { clientesApi, destinosApi, ticketsApi } from '@/lib/api'

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  origenId:           z.string().min(1, 'Requerido'),
  destinoId:          z.string().min(1, 'Requerido'),
  programacionId:     z.string().optional(),
  tipoPago:           z.enum(['ORIGEN', 'DESTINO']),
  tipoEntrega:        z.enum(['AGENCIA', 'REPARTO']),
  fechaViaje:         z.string().min(1, 'Requerido'),
  atencion1:          z.string().optional(),
  atencion2:          z.string().optional(),
  remitenteTipoDoc:   z.enum(['DNI', 'RUC']),
  remitenteDoc:       z.string().min(8, 'Mínimo 8 dígitos'),
  remitenteNombre:    z.string().min(2, 'Requerido'),
  remitenteTel:       z.string().optional(),
  destinatarioTipoDoc:z.enum(['DNI', 'RUC']),
  destinatarioDoc:    z.string().min(8, 'Mínimo 8 dígitos'),
  destinatarioNombre: z.string().min(2, 'Requerido'),
  destinatarioTel:    z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ─── PersonaField ─────────────────────────────────────────────────────────────
function PersonaField({ prefix, label, register, setValue, watch, errors, disabled }: {
  prefix: 'remitente' | 'destinatario'; label: string
  register: any; setValue: any; watch: any; errors: any; disabled?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [status,  setStatus]  = useState<'idle'|'ok'|'error'>('idle')
  const tipoDoc = watch(`${prefix}TipoDoc`)
  const doc     = watch(`${prefix}Doc`)

  const consultar = async () => {
    if (!doc || doc.length < 8) { toast.error('Ingrese el número de documento'); return }
    setLoading(true); setStatus('idle')
    try {
      if (tipoDoc === 'DNI') {
        const res = await consultarRENIEC(doc)
        if (res) {
          setValue(`${prefix}Nombre`, res.nombreCompleto, { shouldValidate: true })
          setStatus('ok'); toast.success(`${label} encontrado en RENIEC`)
        } else { setStatus('error'); toast.error('DNI no encontrado en RENIEC') }
      } else {
        const res = await consultarSUNAT(doc)
        if (res) {
          setValue(`${prefix}Nombre`, res.razonSocial, { shouldValidate: true })
          setStatus('ok'); toast.success('Empresa encontrada en SUNAT')
        } else { setStatus('error'); toast.error('RUC no encontrado en SUNAT') }
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 flex-1 min-w-[280px]">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">{label}</p>
      <div className="flex gap-2 mb-2">
        <Select {...register(`${prefix}TipoDoc`)} className="w-20 text-[11px] py-1.5" disabled={disabled}>
          <option value="DNI">DNI</option>
          <option value="RUC">RUC</option>
        </Select>
        <div className="flex flex-1 gap-1.5">
          <Input
            {...register(`${prefix}Doc`)}
            placeholder={tipoDoc === 'DNI' ? '8 dígitos' : '11 dígitos'}
            maxLength={tipoDoc === 'DNI' ? 8 : 11}
            className="flex-1 text-[12px]"
            onKeyDown={(e) => e.key === 'Enter' && consultar()}
            disabled={disabled}
          />
          <button type="button" onClick={consultar} disabled={loading || disabled}
            className="px-2.5 bg-navy-500 text-white rounded hover:bg-navy-600
                       disabled:opacity-50 transition-colors flex items-center gap-1.5 text-[11px] whitespace-nowrap">
            {loading ? <Loader2 size={12} className="animate-spin"/> :
              tipoDoc === 'DNI' ? <User size={12}/> : <Building2 size={12}/>}
            {tipoDoc === 'DNI' ? 'RENIEC' : 'SUNAT'}
          </button>
        </div>
      </div>
      <div className="relative mb-2">
        <Input {...register(`${prefix}Nombre`)} placeholder="Nombre / Razón social"
          className="w-full pr-7 text-[12px]" disabled={disabled}/>
        {status === 'ok'    && <CheckCircle2 size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500"/>}
        {status === 'error' && <AlertCircle  size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400"/>}
      </div>
      {errors[`${prefix}Nombre`] && (
        <p className="text-red-500 text-[10px] mb-1">{errors[`${prefix}Nombre`].message}</p>
      )}
      <Input {...register(`${prefix}Tel`)} placeholder="Teléfono" className="w-full text-[12px]"/>
    </div>
  )
}

// ─── Modal Reenvío ────────────────────────────────────────────────────────────
function ModalReenvio({ onSelect, onClose }: {
  onSelect: (t: TicketType) => void; onClose: () => void
}) {
  const [q, setQ]       = useState('')
  const [results, setR] = useState<TicketType[]>([])
  const [searched, setS]= useState(false)

  const buscar = () => {
    const l = q.toLowerCase().trim()
    const found = l
      ? TICKETS_DB.filter(t =>
          t.numeroTicket.includes(l) ||
          t.remitente.razonSocial.toLowerCase().includes(l) ||
          (t.remitente.ruc||'').includes(l) ||
          (t.remitente.dni||'').includes(l) ||
          t.destinatario.razonSocial.toLowerCase().includes(l)
        )
      : TICKETS_DB
    setR(found); setS(true)
  }

  const estadoLabel: Record<string,string> = {
    PENDIENTE:'Pendiente', EN_TRANSITO:'En Tránsito',
    DESEMBARQUE_EN_DESTINO:'Desembarque', ENTREGADO:'Entregado', ANULADO:'Anulado',
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div>
            <h3 className="text-[15px] font-semibold text-navy-500">Buscar ticket para reenvío</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Se copiarán: remitente, mercadería y guías. Solo deberá completar destino y destinatario.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18}/></button>
        </div>
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex gap-2">
            <Input value={q} onChange={e=>setQ(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&buscar()}
              placeholder="N° ticket, nombre, DNI o RUC..." className="flex-1"/>
            <Button variant="primary" icon={<Search size={13}/>} onClick={buscar}>Buscar</Button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {!searched && <p className="py-10 text-center text-gray-400 text-[12px]">Ingrese un término para buscar</p>}
          {searched && results.length === 0 && <p className="py-10 text-center text-gray-400 text-[12px]">Sin resultados</p>}
          {results.map(t => (
            <button key={t.id} onClick={() => onSelect(t)}
              className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-bold text-navy-500">{t.numeroTicket}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {t.origen.nombre} → {t.destino.nombre}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    <span className="font-medium">Rem:</span> {t.remitente.razonSocial}
                  </p>
                  <p className="text-[11px] text-gray-600">
                    <span className="font-medium">Des:</span> {t.destinatario.razonSocial}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {t.mercaderias.map(m=>`${m.tipo} (${m.pesoTotal}kg x${m.cantidad})`).join(' | ')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {estadoLabel[t.estado] || t.estado}
                  </span>
                  <p className="text-[13px] font-bold text-navy-500 mt-1">
                    S/ {t.total.toFixed(2)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="p-3 bg-gray-50 rounded-b-xl text-center flex-shrink-0">
          <p className="text-[10px] text-gray-400">
            {results.length > 0 ? `${results.length} ticket(s) encontrados` : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function RecepcionPage() {
  const router = useRouter()
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [destinos, setDestinos] = useState<Destino[]>(DESTINOS_LIST)
  const [savedTicket, setSavedTicket] = useState<TicketType | null>(null)
  const { guias, mercaderias, addGuia, removeGuia, addMercaderia, removeMercaderia, resetRecepcion } =
    useRecepcionStore()

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    if (isDemoMode) return
    destinosApi.listar()
      .then(res => setDestinos(res.data))
      .catch(() => toast.error('No se pudo cargar el catálogo de destinos'))
  }, [isDemoMode])

  const [habilitar, setHabilitar]       = useState(false)
  const [busquedaMode, setBusqueda]     = useState(false)
  const [grrInput, setGrrInput]         = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [esReenvio, setEsReenvio]       = useState(false)
  const [ticketOrigen, setTicketOrigen] = useState<TicketType|null>(null)

  const [mercForm, setMercForm] = useState({
    tipo:'', pesoTotal:0, cantidad:1, numeroBultos:1, descripcion:'', esPesoVolumen:false,
  })
  const { subTotal, igv, total } = calcularMontos(
    mercForm.pesoTotal, mercForm.cantidad, COSTO_KG_DEFAULT
  )

  const { control, register, handleSubmit, setValue, watch, formState:{errors}, reset } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        tipoPago:'DESTINO', tipoEntrega:'AGENCIA', fechaViaje:today,
        remitenteTipoDoc:'DNI', destinatarioTipoDoc:'DNI',
      },
    })

  // ── Aplicar reenvío ────────────────────────────────────────────────────────
  const aplicarReenvio = (t: TicketType) => {
    setShowModal(false); setEsReenvio(true); setTicketOrigen(t)
    setValue('remitenteTipoDoc', t.remitente.ruc ? 'RUC' : 'DNI')
    setValue('remitenteDoc',     t.remitente.ruc || t.remitente.dni || '')
    setValue('remitenteNombre',  t.remitente.razonSocial)
    setValue('remitenteTel',     t.remitente.telefono || '')
    setValue('origenId',         t.destino.id)          // destino anterior = nuevo origen
    setValue('tipoPago',         t.tipoPago)
    setValue('tipoEntrega',      t.tipoEntrega)
    setValue('destinoId',          '')
    setValue('destinatarioDoc',    '')
    setValue('destinatarioNombre', '')
    resetRecepcion()
    t.guiasRemision.forEach(g => addGuia(g.codigo))
    t.mercaderias.forEach(m => addMercaderia(m))
    toast.success(`Ticket ${t.numeroTicket} cargado — complete destino y destinatario`)
  }

  const cancelarReenvio = () => {
    setEsReenvio(false); setTicketOrigen(null); resetRecepcion(); reset()
  }

  const handleAddGRR = () => {
    const codigo = grrInput.trim()
    if (!codigo) return
    if (!/^[0-9]{3}-?[0-9]{6,}(?:\/[0-9]+)?$/.test(codigo)) {
      toast.error('Formato de guía no válido')
      return
    }
    if (guias.some(g => g.codigo.toLowerCase() === codigo.toLowerCase())) {
      toast.error('La guía ya fue agregada')
      return
    }
    addGuia(codigo)
    setGrrInput('')
  }

  const handleAddMerc = () => {
    if (!mercForm.tipo) { toast.error('Seleccione tipo de mercadería'); return }
    if (mercForm.pesoTotal <= 0) { toast.error('Ingrese el peso'); return }
    addMercaderia({ tipo:mercForm.tipo, descripcion:mercForm.descripcion,
      pesoTotal:mercForm.pesoTotal, costoKg:COSTO_KG_DEFAULT, cantidad:mercForm.cantidad,
      numeroBultos:mercForm.numeroBultos, esPesoVolumen:mercForm.esPesoVolumen, subTotal, igv, total })
    setMercForm({ tipo:'', pesoTotal:0, cantidad:1, numeroBultos:1, descripcion:'', esPesoVolumen:false })
    toast.success('Mercadería agregada')
  }

  const totalGeneral    = mercaderias.reduce((s,m)=>s+m.total,0)
  const subtotalGeneral = mercaderias.reduce((s,m)=>s+m.subTotal,0)
  const igvGeneral      = mercaderias.reduce((s,m)=>s+m.igv,0)

  const onSubmit = async (data: FormData) => {
    if (mercaderias.length === 0) { toast.error('Agregue al menos una mercadería'); return }
    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 500))
        toast.success(`Ticket demo generado: ${nextNumeroTicket()}`)
      } else {
        const resolveCliente = async (tipoDoc: 'DNI' | 'RUC', doc: string, nombre: string, telefono?: string): Promise<Cliente> => {
          try {
            return (await clientesApi.byDniRuc(doc)).data
          } catch (error: any) {
            if (error.response?.status !== 404) throw error
            return (await clientesApi.crear({
              tipo: tipoDoc === 'RUC' ? 'JURIDICO' : 'NATURAL',
              razonSocial: nombre, dni: tipoDoc === 'DNI' ? doc : undefined,
              ruc: tipoDoc === 'RUC' ? doc : undefined, telefono,
            })).data
          }
        }
        const [remitente, destinatario] = await Promise.all([
          resolveCliente(data.remitenteTipoDoc, data.remitenteDoc, data.remitenteNombre, data.remitenteTel),
          resolveCliente(data.destinatarioTipoDoc, data.destinatarioDoc, data.destinatarioNombre, data.destinatarioTel),
        ])
        let nextBultoNumber = 0
        const bultos = mercaderias.flatMap((item) => Array.from({ length: Math.max(1, Number(item.numeroBultos || 1)) }, () => ({
          numero: ++nextBultoNumber,
          tipo: item.tipo,
          descripcion: item.descripcion,
          pesoReal: Number(item.pesoTotal || 0) / Math.max(1, Number(item.numeroBultos || 1)),
          cantidad: 1,
        })))
        const response = await ticketsApi.crear({
          fechaViaje: data.fechaViaje, origenId: data.origenId, destinoId: data.destinoId,
          programacionId: data.programacionId || undefined, tipoPago: data.tipoPago,
          tipoEntrega: data.tipoEntrega, atencion1: data.atencion1, atencion2: data.atencion2,
          remitenteId: remitente.id, destinatarioId: destinatario.id,
          guiasRemision: guias, mercaderias, bultos,
        } as Parameters<typeof ticketsApi.crear>[0])
        setSavedTicket(response.data)
        toast.success(`Ticket generado: ${response.data.numeroTicket}`)
      }
      reset(); resetRecepcion(); setEsReenvio(false); setTicketOrigen(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo guardar la recepción')
    }
  }

  const floatActions = [
    { label:'Pagar', icon:<Banknote size={14}/>, onClick:()=> savedTicket ? router.push(`/busqueda?ticket=${savedTicket.id}`) : toast('Guarde el ticket primero'), primary:true },
    { label:'Ver QR', icon:<QrCode size={14}/>, onClick:async()=> {
      if (!savedTicket || isDemoMode) return toast('El QR estará disponible después de guardar en modo real')
      const { data } = await ticketsApi.getQR(savedTicket.id); window.open(data.qrUrl, '_blank', 'noopener,noreferrer')
    } },
    { label:'Configuración', icon:<Settings size={14}/>, onClick:()=>router.push('/configuracion') },
    { label:'Ticket', icon:<Ticket size={14}/>, onClick:async()=> {
      if (!savedTicket || isDemoMode) return toast('Guarde el ticket primero')
      const { data } = await ticketsApi.imprimirTicket(savedTicket.id)
      const blobUrl = URL.createObjectURL(data); window.open(blobUrl, '_blank', 'noopener,noreferrer')
    } },
    { label:'Guardar', icon:<Save size={14}/>, onClick:handleSubmit(onSubmit) },
  ]

  return (
    <div className="pb-28">
      <PageHeader
        title="Registro de la Nueva Recepcion de Carga"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<RefreshCw size={13}/>}
              onClick={()=>setShowModal(true)}>
              Reenviar ticket existente
            </Button>
            <Button variant="primary" size="sm" icon={<Search size={13}/>}
              onClick={()=>router.push('/busqueda')}>
              Búsqueda de Tickets
            </Button>
          </div>
        }
      />

      {/* Banner reenvío activo */}
      {esReenvio && ticketOrigen && (
        <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
          <RefreshCw size={15} className="text-amber-600 flex-shrink-0"/>
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-amber-800">
              Reenvío desde {ticketOrigen.numeroTicket}
            </p>
            <p className="text-[11px] text-amber-600">
              Ruta original: <strong>{ticketOrigen.origen.nombre} → {ticketOrigen.destino.nombre}</strong> —
              Remitente y mercadería copiados. <strong>Complete destino y destinatario.</strong>
            </p>
          </div>
          <button onClick={cancelarReenvio} className="text-amber-600 hover:text-amber-800">
            <X size={14}/>
          </button>
        </div>
      )}

      {/* ENCABEZADO */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <FormField label="N° Ticket" className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                <Input className="pl-7 w-full" disabled={!busquedaMode} placeholder="Buscar N° ticket..."/>
              </div>
              <Toggle checked={busquedaMode} onChange={setBusqueda} label="Búsqueda"/>
            </div>
          </FormField>
          <FormField label="Fecha de Emisión">
            <Input value={today} readOnly className="text-gray-500 w-36"/>
          </FormField>
          <FormField label="Fecha de Viaje" error={errors.fechaViaje?.message}>
            <Input type="date" {...register('fechaViaje')} className="w-36"/>
          </FormField>
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <p className="text-[11px] font-semibold text-gray-500 mb-2">Imprimir declaración Jurada</p>
            <div className="flex items-center gap-3">
              <Toggle checked={habilitar} onChange={setHabilitar} label="Habilitar"/>
              <Button variant="primary" size="xs" icon={<Printer size={11}/>} disabled={!habilitar}>Imprimir</Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <FormField label="Origen" error={errors.origenId?.message} className="min-w-[160px]">
            <Select {...register('origenId')} disabled={esReenvio}>
              <option value="">Seleccionar</option>
              {destinos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label="Destino" error={errors.destinoId?.message} className="min-w-[160px]">
            <Select {...register('destinoId')}>
              <option value="">Seleccionar</option>
              {destinos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label="Programación" className="flex-1 min-w-[240px]">
            <Select {...register('programacionId')}>
              <option value="">Seleccione Programación</option>
              {PROGRAMACIONES.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </FormField>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50 min-w-[190px]">
            <p className="text-[11px] font-semibold text-gray-500 mb-2">Tipo de Pago</p>
            <Controller control={control} name="tipoPago" render={({field})=>(
              <RadioGroup name="tipoPago"
                options={[{label:'Origen',value:'ORIGEN'},{label:'Destino',value:'DESTINO'}]}
                value={field.value as TipoPago} onChange={field.onChange}/>
            )}/>
          </div>
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50 min-w-[190px]">
            <p className="text-[11px] font-semibold text-gray-500 mb-2">Tipo de Entrega</p>
            <Controller control={control} name="tipoEntrega" render={({field})=>(
              <RadioGroup name="tipoEntrega"
                options={[{label:'Agencia',value:'AGENCIA'},{label:'Reparto',value:'REPARTO'}]}
                value={field.value as TipoEntrega} onChange={field.onChange}/>
            )}/>
          </div>
          <FormField label="Atención 1" className="flex-1 min-w-[140px]">
            <Input {...register('atencion1')}/>
          </FormField>
          <FormField label="Atención 2" className="flex-1 min-w-[140px]">
            <Input {...register('atencion2')}/>
          </FormField>
        </div>
      </Card>

      {/* REMITENTE / DESTINATARIO */}
      <Card className="mb-4">
        <SectionTitle>Datos del envío</SectionTitle>
        <div className="flex flex-wrap gap-3">
          <PersonaField prefix="remitente"    label="Remitente"
            register={register} setValue={setValue} watch={watch} errors={errors}
            disabled={esReenvio}/>
          <PersonaField prefix="destinatario" label="Destinatario"
            register={register} setValue={setValue} watch={watch} errors={errors}/>
        </div>
      </Card>

      {/* GRR */}
      <Card className="mb-4">
        <SectionTitle>N GRR / Documento del cliente</SectionTitle>
        <FormField label="Guia de remision remitente" className="max-w-md">
          <div className="flex gap-2">
            <Input value={grrInput} onChange={e=>setGrrInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleAddGRR()}
              placeholder="003-1234567/7584" className="flex-1"/>
            <button type="button" onClick={handleAddGRR}
              className="w-9 h-[34px] bg-sky-brand text-white rounded flex items-center
                         justify-center hover:bg-sky-dark transition-colors">
              <Plus size={16}/>
            </button>
          </div>
        </FormField>
        {guias.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {guias.map((g,i)=>(
              <span key={i} className="inline-flex items-center gap-1.5 bg-blue-50
                                       text-navy-500 rounded px-2.5 py-1 text-[11px] font-medium">
                {g.codigo}
                <button onClick={()=>removeGuia(i)} className="text-red-500 hover:text-red-700">
                  <X size={11}/>
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* MERCADERÍA */}
      <Card className="mb-4">
        <SectionTitle>Mercadería</SectionTitle>
        <div className="flex flex-wrap gap-3 mb-3">
          <FormField label="Tipo de Mercadería" className="min-w-[170px]">
            <Select value={mercForm.tipo} onChange={e=>setMercForm(f=>({...f,tipo:e.target.value}))}>
              <option value="">Seleccionar</option>
              {TIPOS_MERCADERIA.map(t=><option key={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label="Peso Total (kg)" className="w-[110px]">
            <Input type="number" min={0} step={0.1} value={mercForm.pesoTotal}
              onChange={e=>setMercForm(f=>({...f,pesoTotal:parseFloat(e.target.value)||0}))}/>
          </FormField>
          <FormField label="Costo / kg" className="w-[90px]">
            <Input value={`S/ ${COSTO_KG_DEFAULT.toFixed(2)}`} readOnly/>
          </FormField>
          <FormField label="Cantidad" className="w-[80px]">
            <Input type="number" min={1} value={mercForm.cantidad}
              onChange={e=>setMercForm(f=>({...f,cantidad:parseInt(e.target.value)||1}))}/>
          </FormField>
          <FormField label="Bultos" className="w-[75px]">
            <Input type="number" min={1} value={mercForm.numeroBultos}
              onChange={e=>setMercForm(f=>({...f,numeroBultos:parseInt(e.target.value)||1}))}/>
          </FormField>
          <FormField label="Descripción" className="flex-1 min-w-[200px]">
            <Input value={mercForm.descripcion}
              onChange={e=>setMercForm(f=>({...f,descripcion:e.target.value}))}
              placeholder="Ej: Repuestos industriales"/>
          </FormField>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <p className="text-[11px] font-medium text-gray-500 mb-1">Peso / Volumen</p>
            <Toggle checked={mercForm.esPesoVolumen}
              onChange={v=>setMercForm(f=>({...f,esPesoVolumen:v}))}/>
          </div>
          <FormField label="Sub Total" className="w-[100px]">
            <Input value={`S/ ${subTotal.toFixed(2)}`} readOnly className="font-medium text-gray-700"/>
          </FormField>
          <FormField label="IGV (18%)" className="w-[90px]">
            <Input value={`S/ ${igv.toFixed(2)}`} readOnly/>
          </FormField>
          <FormField label="Total" className="w-[110px]">
            <Input value={`S/ ${total.toFixed(2)}`} readOnly className="font-semibold text-navy-500"/>
          </FormField>
          <div className="pb-0.5">
            <Button variant="primary" icon={<Plus size={13}/>} onClick={handleAddMerc}>Agregar</Button>
          </div>
        </div>

        {mercaderias.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {['Tipo','Descripción','Peso','Cant.','Bultos','Sub Total','IGV','Total',''].map(h=>(
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500
                                           uppercase tracking-wide border-b border-gray-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mercaderias.map((m,i)=>(
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{m.tipo}</td>
                    <td className="px-3 py-2 text-gray-600">{m.descripcion||'—'}</td>
                    <td className="px-3 py-2">{m.pesoTotal} kg</td>
                    <td className="px-3 py-2">{m.cantidad}</td>
                    <td className="px-3 py-2">{m.numeroBultos || 1}</td>
                    <td className="px-3 py-2">S/ {m.subTotal.toFixed(2)}</td>
                    <td className="px-3 py-2">S/ {m.igv.toFixed(2)}</td>
                    <td className="px-3 py-2 font-semibold text-navy-500">S/ {m.total.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <button onClick={()=>removeMercaderia(i)}
                        className="text-red-400 hover:text-red-600"><Trash2 size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 font-semibold text-[11px]">
                  <td colSpan={5} className="px-3 py-2 text-right text-gray-600">TOTALES:</td>
                  <td className="px-3 py-2">S/ {subtotalGeneral.toFixed(2)}</td>
                  <td className="px-3 py-2">S/ {igvGeneral.toFixed(2)}</td>
                  <td className="px-3 py-2 text-navy-500 text-[12px]">S/ {totalGeneral.toFixed(2)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <FloatBar actions={floatActions}/>
      {showModal && <ModalReenvio onSelect={aplicarReenvio} onClose={()=>setShowModal(false)}/>}
    </div>
  )
}
