'use client'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Download, FileCheck, Plus, Printer, RefreshCw, Send, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { BrandHero } from '@/components/brand/BrandIdentity'
import { Button, Card, FormField, Input, Select } from '@/components/ui'
import TicketFiscalSelector from '@/components/ui/TicketFiscalSelector'
import SerieFiscalForm from '@/components/ui/SerieFiscalForm'
import { catalogosV2Api, guiasApi, manifiestoApi } from '@/lib/api'
import { abrirArchivo, mensajeApi, solicitudUuid } from '@/lib/archivos'
import { hoyPeru } from '@/lib/peru-time'
import { useAuthStore } from '@/store'
import type { Ticket } from '@/types'

type Point = { ubigeo: string; direccion: string; codigoLocal?: string; rucLocal?: string }
type Driver = { dni: string; licencia: string; nombres: string; apellidos: string }
type Vehicle = { placa: string; tuc?: string }
type Reference = { draftId?: string; tipo: string; numero: string; rucEmisor: string }
type Item = { draftId?: string; descripcion: string; cantidad: string; unidad: string }
type Party = { tipoDocumento: '1' | '6'; documento: string; razonSocial: string; registroMtc?: string }
type Draft = {
  serie: string; fechaTraslado: string; partida: Point; llegada: Point; pesoBruto: string; unidadPeso: 'KGM' | 'TNE'
  vehiculo?: Vehicle; conductores?: Driver[]; remolques?: Vehicle[]; referencias?: Reference[]; bienes?: Item[]; observacion?: string
  modalidad?: '01' | '02'; motivo?: string; bultos?: number; transportista?: Party
  pagador?: 'Remitente' | 'Subcontratador' | 'Tercero'; terceroPagador?: Party; subcontratador?: Party
}
type Document = {
  id: string; tipoGuia: '31' | '09'; serie: string; numero?: string; estado: string; ambiente: 'TEST' | 'PRODUCTION';
  ticketId: string; manifiestoId?: string; ticketSunat?: string; fechaEnvio?: string; hashXml?: string
  respuestaSunat?: { codigo: string; mensaje?: string; observaciones?: string[] };
  datos?: { traslado: Draft; remitente: Party; destinatario: Party }
}
type ManifestOption = { id: string; codigo: string; tickets?: Array<{ id: string }>; estado: string }

const blankItem = (): Item => ({ draftId: solicitudUuid(), descripcion: '', cantidad: '', unidad: '' })
const blankReference = (): Reference => ({ draftId: solicitudUuid(), tipo: '09', numero: '', rucEmisor: '' })
const blankPoint = (): Point => ({ ubigeo: '', direccion: '' })
const blankParty = (): Party => ({ tipoDocumento: '6', documento: '', razonSocial: '' })
const draft = (): Draft => ({
  serie: '', fechaTraslado: hoyPeru(), partida: blankPoint(), llegada: blankPoint(), pesoBruto: '', unidadPeso: 'KGM',
  pagador: 'Remitente', modalidad: '01', motivo: '', bienes: [],
})
const states: Record<string, string> = {
  BORRADOR: 'Borrador', ENVIANDO: 'Enviando', ENVIADO: 'En procesamiento', REINTENTABLE: 'Acceso rechazado',
  ENVIO_INCIERTO: 'En conciliación', ACEPTADO: 'Aceptado', ACEPTADO_CON_OBSERVACIONES: 'Aceptado con observaciones',
  RECHAZADO: 'Rechazado', ANULADO: 'Anulado',
}
const reasons: Record<string, string> = {
  '01': 'Venta', '02': 'Compra', '03': 'Venta con entrega a terceros', '04': 'Traslado entre establecimientos',
  '05': 'Consignación', '06': 'Devolución', '07': 'Recojo de bienes transformados',
  '13': 'Otros', '14': 'Venta sujeta a confirmación', '17': 'Traslado de bienes para transformación',
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <FormField label={label}><Input aria-label={label} {...props}/></FormField>
}

function PartyFields({ label, party, onChange, allowDni = false, mtc = false }: {
  label: string; party?: Party; onChange: (value: Party) => void; allowDni?: boolean; mtc?: boolean
}) {
  const value = party ?? blankParty()
  return <fieldset className="grid sm:grid-cols-3 gap-3 rounded-lg border p-3">
    <legend className="text-sm font-semibold text-navy-500 px-1">{label}</legend>
    {allowDni && <FormField label="Documento"><Select aria-label={`Tipo de documento ${label}`} value={value.tipoDocumento} onChange={event => onChange({ ...value, tipoDocumento: event.target.value as '1' | '6' })}>
      <option value="6">RUC</option><option value="1">DNI</option>
    </Select></FormField>}
    <Field label={`Número de documento ${label}`} required value={value.documento} pattern={value.tipoDocumento === '6' ? '[0-9]{11}' : '[0-9]{8}'}
      onChange={event => onChange({ ...value, documento: event.target.value })}/>
    <Field label={`Razón social o nombre ${label}`} required value={value.razonSocial} onChange={event => onChange({ ...value, razonSocial: event.target.value })}/>
    {mtc && <Field label="Registro MTC" value={value.registroMtc || ''} onChange={event => onChange({ ...value, registroMtc: event.target.value.toUpperCase() || undefined })}/>}
  </fieldset>
}

function FormGuia({ selected, manifestFilter, onSaved, onClose }: { selected?: Document; manifestFilter?: string; onSaved: (doc: Document) => void; onClose: () => void }) {
  const [data, setData] = useState<Draft>(() => {
    const initial = selected?.datos?.traslado || draft()
    return { ...initial, bienes: initial.bienes?.map(row => ({ ...row, draftId: solicitudUuid() })),
      referencias: initial.referencias?.map(row => ({ ...row, draftId: solicitudUuid() })) }
  })
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [kind, setKind] = useState<'31' | '09'>(selected?.tipoGuia || '31')
  const [manifest, setManifest] = useState(selected?.manifiestoId || manifestFilter || '')
  const [manifests, setManifests] = useState<ManifestOption[]>([])
  const [vehicles, setVehicles] = useState<Array<Vehicle & { id: string; habilitacionMtc?: string }>>([])
  const [drivers, setDrivers] = useState<Array<Driver & { id: string }>>([])
  const [busy, setBusy] = useState(false)
  const [external, setExternal] = useState(Boolean(selected?.datos?.traslado.subcontratador))
  const request = useRef<{ fingerprint: string; id: string } | null>(null)
  const isCarrier = kind === '31'
  const linkedGre = isCarrier && (data.referencias || []).some(ref => ref.tipo === '09' && /^[A-Z]/i.test(ref.numero))
  const requiresFleet = isCarrier || data.modalidad === '02'
  const references = data.referencias ?? []
  const items = data.bienes ?? []
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setData(previous => ({ ...previous, [key]: value }))

  useEffect(() => {
    let active = true
    Promise.allSettled([manifiestoApi.listar({ estado: 'ABIERTO', limit: 100 }), catalogosV2Api.vehiculos({ estado: 'ACTIVO' }), catalogosV2Api.conductores({ estado: 'ACTIVO' })])
      .then(([m, v, d]) => {
        if (!active) return
        if ([m, v, d].some(result => result.status === 'rejected')) toast.error('No se pudieron cargar todos los catálogos de la guía')
        if (m.status === 'fulfilled') setManifests(m.value.data.data || [])
        if (v.status === 'fulfilled') setVehicles(Array.isArray(v.value.data) ? v.value.data : v.value.data.data || [])
        if (d.status === 'fulfilled') setDrivers(Array.isArray(d.value.data) ? d.value.data : d.value.data.data || [])
      })
    return () => { active = false }
  }, [])

  function pickTicket(value: Ticket | null) {
    setTicket(value)
    if (!value || items.length) return
    const goods = (value.mercaderias || []).map(line => ({ draftId: solicitudUuid(), descripcion: line.descripcion || line.tipo || '', cantidad: String(line.cantidad), unidad: '' }))
    set('bienes', goods)
  }

  const updateReference = (index: number, field: keyof Reference, event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    set('referencias', references.map((reference, i) => i === index ? { ...reference, [field]: event.target.value.toUpperCase() } : reference))
  const updateItem = (index: number, field: keyof Item, event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    set('bienes', items.map((item, i) => i === index ? { ...item, [field]: event.target.value } : item))

  return <Card className="p-4">
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault()
      if (!selected && !ticket) return
      const payload: Record<string, unknown> = {
        ...data, serie: data.serie.toUpperCase(), bienes: linkedGre ? [] : items.map(({ descripcion, cantidad, unidad }) => ({ descripcion, cantidad, unidad })),
        referencias: references.map(({ tipo, numero, rucEmisor }) => ({ tipo, numero, rucEmisor })),
        pagador: isCarrier ? data.pagador || 'Remitente' : undefined,
        terceroPagador: isCarrier && data.pagador === 'Tercero' ? data.terceroPagador : undefined,
        subcontratador: isCarrier && external ? data.subcontratador : undefined,
        modalidad: isCarrier ? undefined : data.modalidad || '01',
        motivo: isCarrier ? undefined : data.motivo,
        transportista: !isCarrier && (data.modalidad || '01') === '01' ? data.transportista : undefined,
        bultos: isCarrier ? undefined : data.bultos,
        vehiculo: requiresFleet ? data.vehiculo : undefined,
        conductores: requiresFleet ? data.conductores : undefined,
        remolques: requiresFleet ? data.remolques : undefined,
        observacion: data.observacion || undefined,
      }
      setBusy(true)
      try {
        if (selected) onSaved((await guiasApi.editar(selected.id, payload)).data)
        else {
          const scope = { ...payload, ticketId: ticket?.id, manifiestoId: manifest || undefined, tipoGuia: kind }
          const fingerprint = JSON.stringify(scope)
          if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: solicitudUuid() }
          onSaved((await guiasApi.crear({ ...scope, solicitudId: request.current.id })).data)
        }
        toast.success('Borrador guardado')
      } catch (error) { toast.error(mensajeApi(error, 'No se pudo guardar la guía')) }
      finally { setBusy(false) }
    }}>
      <div className="flex items-center justify-between gap-2"><h2 className="font-bold text-navy-500">{selected ? 'Editar borrador' : 'Nueva guía'}</h2><Button variant="ghost" type="button" onClick={onClose}>Cerrar</Button></div>
      {!selected && <>
        <TicketFiscalSelector value={ticket?.id || ''} onSelect={pickTicket}/>
        <FormField label="Manifiesto vinculado"><Select aria-label="Manifiesto vinculado" value={manifest} onChange={event => setManifest(event.target.value)}>
          <option value="">Sin manifiesto</option>
          {manifests.filter(option => !ticket || option.tickets?.some(entry => entry.id === ticket.id) || option.id === manifest).map(option => <option key={option.id} value={option.id}>{option.codigo}</option>)}
        </Select></FormField>
      </>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <FormField label="Tipo de guía"><Select aria-label="Tipo de guía" disabled={Boolean(selected)} value={kind} onChange={event => setKind(event.target.value as '31' | '09')}>
          <option value="31">Transportista</option><option value="09">Remitente</option>
        </Select></FormField>
        <Field label="Serie" value={data.serie} required maxLength={4} pattern={isCarrier ? 'V[A-Z0-9]{3}' : 'T[A-Z0-9]{3}'} onChange={event => set('serie', event.target.value.toUpperCase())}/>
        <Field label="Fecha de traslado" type="date" min={hoyPeru()} required value={data.fechaTraslado} onChange={event => set('fechaTraslado', event.target.value)}/>
        <Field label="Peso bruto" type="number" min="0.001" step="0.001" required value={data.pesoBruto} onChange={event => set('pesoBruto', event.target.value)}/>
        <FormField label="Unidad de peso"><Select aria-label="Unidad de peso" value={data.unidadPeso} onChange={event => set('unidadPeso', event.target.value as Draft['unidadPeso'])}>
          <option value="KGM">Kilogramos</option><option value="TNE">Toneladas</option>
        </Select></FormField>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {(['partida', 'llegada'] as const).map(point => <fieldset key={point} className="grid sm:grid-cols-[120px_1fr] gap-2 border p-3 rounded-lg">
          <legend className="text-sm font-semibold px-1 capitalize">{point}</legend>
          <Field label={`Ubigeo de ${point}`} required pattern="[0-9]{6}" maxLength={6} value={data[point].ubigeo}
            onChange={event => set(point, { ...data[point], ubigeo: event.target.value })}/>
          <Field label={`Dirección de ${point}`} required maxLength={500} value={data[point].direccion}
            onChange={event => set(point, { ...data[point], direccion: event.target.value })}/>
        </fieldset>)}
      </div>

      {isCarrier ? <>
        <div className="grid sm:grid-cols-2 gap-3 items-center">
          <FormField label="Pagador del flete"><Select aria-label="Pagador del flete" value={data.pagador || 'Remitente'} onChange={event => set('pagador', event.target.value as Draft['pagador'])}>
            <option value="Remitente">Remitente</option><option value="Tercero">Tercero</option>
            {external && <option value="Subcontratador">Subcontratador</option>}
          </Select></FormField>
          <label className="text-sm"><input checked={external} type="checkbox" onChange={event => {
            setExternal(event.target.checked)
            if (!event.target.checked && data.pagador === 'Subcontratador') set('pagador', 'Remitente')
          }}/> Transporte subcontratado</label>
        </div>
        {external && <PartyFields label="Subcontratador" party={data.subcontratador} onChange={party => set('subcontratador', party)}/>}
        {data.pagador === 'Tercero' && <PartyFields label="Tercero pagador" allowDni party={data.terceroPagador} onChange={party => set('terceroPagador', party)}/>}
      </> : <>
        <div className="grid sm:grid-cols-2 gap-3">
          <FormField label="Modalidad"><Select aria-label="Modalidad" value={data.modalidad || '01'} onChange={event => set('modalidad', event.target.value as Draft['modalidad'])}>
            <option value="01">Público</option><option value="02">Privado</option></Select></FormField>
          <FormField label="Motivo de traslado"><Select aria-label="Motivo de traslado" required value={data.motivo || ''} onChange={event => set('motivo', event.target.value)}>
            <option value="">Seleccione</option>{Object.entries(reasons).map(([code, description]) => <option value={code} key={code}>{description}</option>)}
          </Select></FormField>
        </div>
        {(data.modalidad || '01') === '01' && <PartyFields label="Transportista" mtc party={data.transportista} onChange={party => set('transportista', party)}/>}
      </>}

      {requiresFleet && <fieldset className="grid sm:grid-cols-2 gap-3 border p-3 rounded-lg">
        <legend className="text-sm font-semibold px-1">Flota del traslado</legend>
        <FormField label="Usar vehículo registrado"><Select aria-label="Usar vehículo registrado" value="" onChange={event => {
          const vehicle = vehicles.find(item => item.id === event.target.value)
          if (vehicle) set('vehiculo', { placa: vehicle.placa.replace(/[-\s]/g, '').toUpperCase(), tuc: vehicle.tuc || vehicle.habilitacionMtc || undefined })
        }}><option value="">Seleccione para completar</option>{vehicles.map(item => <option value={item.id} key={item.id}>{item.placa}</option>)}</Select></FormField>
        <FormField label="Usar conductor registrado"><Select aria-label="Usar conductor registrado" value="" onChange={event => {
          const driver = drivers.find(item => item.id === event.target.value)
          if (driver) set('conductores', [{ dni: driver.dni, licencia: driver.licencia, nombres: driver.nombres, apellidos: driver.apellidos }, ...(data.conductores || []).slice(1)])
        }}><option value="">Seleccione para completar</option>{drivers.map(item => <option value={item.id} key={item.id}>{item.nombres} {item.apellidos}</option>)}</Select></FormField>
        <Field label="Placa principal" value={data.vehiculo?.placa || ''} required={!manifest} onChange={event => set('vehiculo', { ...data.vehiculo, placa: event.target.value.toUpperCase() })}/>
        <Field label="TUC o certificado de habilitación" value={data.vehiculo?.tuc || ''} required={isCarrier && !manifest} onChange={event => set('vehiculo', { placa: data.vehiculo?.placa || '', tuc: event.target.value.toUpperCase() || undefined })}/>
        {(['dni', 'licencia', 'nombres', 'apellidos'] as const).map(field => <Field key={field} label={`Conductor principal · ${field}`} required={!manifest} value={data.conductores?.[0]?.[field] || ''}
          onChange={event => {
            const first = data.conductores?.[0] ?? { dni: '', licencia: '', nombres: '', apellidos: '' }
            set('conductores', [{ ...first, [field]: event.target.value }, ...(data.conductores || []).slice(1)])
          }}/>)}
      </fieldset>}

      <section className="space-y-2">
        <div className="flex items-center justify-between"><h3 className="font-semibold text-navy-500">Documentos relacionados</h3><Button type="button" variant="outline" onClick={() => set('referencias', [...references, blankReference()])}>Agregar documento</Button></div>
        {references.map((ref, index) => <div key={ref.draftId} className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
          <FormField label="Tipo de documento"><Select aria-label={`Tipo relacionado ${index + 1}`} value={ref.tipo} onChange={event => updateReference(index, 'tipo', event)}>
            <option value="09">GRE remitente</option><option value="01">Factura</option><option value="03">Boleta</option><option value="04">Liquidación de compra</option><option value="12">Ticket de máquina</option><option value="31">GRE transportista</option><option value="48">Comprobante de operaciones</option>
          </Select></FormField>
          <Field label="Serie y número" required value={ref.numero} onChange={event => updateReference(index, 'numero', event)}/>
          <Field label="RUC del emisor" required pattern="[0-9]{11}" value={ref.rucEmisor} onChange={event => updateReference(index, 'rucEmisor', event)}/>
          <Button type="button" variant="ghost" aria-label="Quitar documento" onClick={() => set('referencias', references.filter((_, i) => i !== index))}><Trash2 size={15}/></Button>
        </div>)}
      </section>

      {!linkedGre && <section className="space-y-2">
        <div className="flex items-center justify-between"><h3 className="font-semibold text-navy-500">Bienes</h3><Button type="button" variant="outline" onClick={() => set('bienes', [...items, blankItem()])}>Agregar bien</Button></div>
        {items.map((item, index) => <div key={item.draftId} className="grid sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end">
          <Field label="Descripción" required value={item.descripcion} onChange={event => updateItem(index, 'descripcion', event)}/>
          <Field label="Cantidad" required value={item.cantidad} inputMode="decimal" onChange={event => updateItem(index, 'cantidad', event)}/>
          <FormField label="Unidad"><Select aria-label={`Unidad del bien ${index + 1}`} required value={item.unidad} onChange={event => updateItem(index, 'unidad', event)}>
            <option value="">Seleccione</option><option value="NIU">Unidad</option><option value="KGM">Kilogramo</option><option value="BX">Caja</option>
            <option value="BG">Bolsa</option><option value="SA">Saco</option><option value="PK">Paquete</option>
          </Select></FormField>
          <Button type="button" variant="ghost" aria-label="Quitar bien" onClick={() => set('bienes', items.filter((_, i) => i !== index))}><Trash2 size={15}/></Button>
        </div>)}
      </section>}
      <Field label="Observación" maxLength={250} value={data.observacion || ''} onChange={event => set('observacion', event.target.value)}/>
      <Button type="submit" loading={busy} disabled={!selected && !ticket}>Guardar borrador</Button>
    </form>
  </Card>
}

export default function GuiasPage() {
  const { token, user } = useAuthStore()
  const realSession = Boolean(token && !token.startsWith('demo-'))
  const manage = realSession && ['SUPERADMIN','SUPERVISOR','ADMIN_SEDE'].includes(user?.rol || '')
  const [rows, setRows] = useState<Document[]>([])
  const [form, setForm] = useState(false)
  const [selected, setSelected] = useState<Document>()
  const [manifest, setManifest] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sync, setSync] = useState(0)
  const [progress, setProgress] = useState('')
  const [failure, setFailure] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setManifest(new URLSearchParams(window.location.search).get('manifiestoId') || '')
  }, [])

  useEffect(() => {
    if (!realSession) return
    let active = true
    guiasApi.listar({ manifiestoId: manifest || undefined, page }).then(({ data }) => {
      if (!active) return
      setRows(data.data)
      setTotalPages(Math.max(1, data.totalPages))
      setFailure('')
    }).catch(error => { if (active) setFailure(mensajeApi(error, 'No se pudieron cargar guías')) })
      .finally(() => { if (active) setLoaded(true) })
    return () => { active = false }
  }, [realSession, manifest, page, sync])

  async function task(name: string, action: () => Promise<unknown>) {
    setProgress(name)
    try { await action() }
    catch (error) { toast.error(mensajeApi(error, 'No se pudo completar la operación')) }
    finally { setProgress('') }
  }

  async function open(row: Document) {
    await task('detalle', async () => { setForm(false); setSelected((await guiasApi.detalle(row.id)).data) })
  }

  async function process(action: 'validar' | 'enviar' | 'consultar') {
    if (!selected) return
    await task(action, async () => {
      const { data } = await guiasApi.procesar(selected.id, action)
      if (action === 'validar') toast.success('XML firmado validado contra XSD')
      else { setSelected(data); setSync(previous => previous + 1) }
    })
  }

  function file(kind: 'xml' | 'zip' | 'cdr' | 'pdf', print = false) {
    if (!selected) return
    const number = `${selected.serie}-${selected.numero || 'borrador'}`
    void task(kind, () => abrirArchivo(() => guiasApi.archivo(selected.id, kind, print), `${kind}-${number}.${kind === 'cdr' ? 'zip' : kind}`, print))
  }

  return <div className="space-y-4">
    <BrandHero compact title="Guías de remisión" description="Guías de transportista y remitente vinculadas a la operación de carga."/>
    {!realSession && <Card className="p-4">Ingrese con su usuario operativo para gestionar guías.</Card>}
    {manage && <div className="flex gap-2">
      <Button icon={<Plus size={15}/>} onClick={() => { setSelected(undefined); setForm(true) }}>Nuevo borrador</Button>
      {manifest && <Button variant="outline" onClick={() => { setManifest(''); setPage(1) }}>Ver todos los manifiestos</Button>}
    </div>}
    {manage && user?.rol === 'SUPERADMIN' && <SerieFiscalForm kind="GRE"/>}
    {form && manage && <FormGuia key={selected?.id || 'new'} selected={selected} manifestFilter={manifest} onClose={() => setForm(false)} onSaved={doc => {
      setForm(false); setSelected(doc); setSync(previous => previous + 1)
    }}/>}
    {selected && !form && <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div><h2 className="font-bold text-navy-500">{selected.tipoGuia === '31' ? 'Transportista' : 'Remitente'} · {selected.serie}{selected.numero ? `-${selected.numero}` : ''}</h2>
          <p className="text-sm">{states[selected.estado] || selected.estado} · {selected.ambiente === 'TEST' ? 'Pruebas locales' : 'Producción'}</p></div>
        <Button variant="ghost" onClick={() => setSelected(undefined)}>Cerrar detalle</Button>
      </div>
      {selected.datos && <p className="text-sm">{selected.datos.remitente.razonSocial} → {selected.datos.destinatario.razonSocial} · {selected.datos.traslado.fechaTraslado}</p>}
      {selected.ticketSunat && <p className="text-sm break-all">Ticket SUNAT {selected.ticketSunat}</p>}
      {selected.respuestaSunat && <div className="text-sm space-y-1">
        <p>{selected.respuestaSunat.codigo} {selected.respuestaSunat.mensaje}</p>
        {Array.from(new Set(selected.respuestaSunat.observaciones)).map(note => <p key={note}>{note}</p>)}
      </div>}
      <div className="flex flex-wrap gap-2">
        {manage && selected.estado === 'BORRADOR' && <>
          <Button variant="outline" onClick={() => setForm(true)}>Editar</Button>
          <Button variant="outline" icon={<FileCheck size={14}/>} disabled={Boolean(progress)} onClick={() => process('validar')}>Validar XML</Button>
        </>}
        {manage && ['BORRADOR','REINTENTABLE'].includes(selected.estado) && <Button icon={<Send size={14}/>} disabled={Boolean(progress)} onClick={() => process('enviar')}>{selected.estado === 'REINTENTABLE' ? 'Reintentar envío' : 'Enviar guía'}</Button>}
        {manage && selected.estado === 'ENVIADO' && <Button icon={<RefreshCw size={14}/>} disabled={Boolean(progress)} onClick={() => process('consultar')}>Consultar SUNAT</Button>}
        <Button variant="outline" icon={<Download size={14}/>} disabled={Boolean(progress)} onClick={() => file('pdf')}>PDF</Button>
        <Button variant="outline" icon={<Printer size={14}/>} disabled={Boolean(progress)} onClick={() => file('pdf', true)}>Abrir para imprimir</Button>
        {selected.hashXml && <><Button variant="outline" onClick={() => file('xml')}>XML</Button><Button variant="outline" onClick={() => file('zip')}>ZIP</Button></>}
        {['ACEPTADO','ACEPTADO_CON_OBSERVACIONES','RECHAZADO'].includes(selected.estado) && <Button variant="outline" onClick={() => file('cdr')}>CDR</Button>}
      </div>
      {['SUPERADMIN','SUPERVISOR'].includes(user?.rol || '') && ['ENVIANDO','ENVIO_INCIERTO'].includes(selected.estado) && <form className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end" onSubmit={event => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        void task('conciliar', async () => {
          const { data } = await guiasApi.conciliar(selected.id, { ticket: String(formData.get('ticket')), motivo: String(formData.get('reason')) })
          setSelected(data); setSync(previous => previous + 1)
        })
      }}><Field label="Ticket SUNAT recuperado" name="ticket" required/><Field label="Motivo de conciliación" name="reason" required minLength={8}/>
        <Button type="submit" loading={progress === 'conciliar'}>Conciliar con CDR</Button>
      </form>}
    </Card>}
    {realSession && <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{['Número','Tipo','Ambiente','Estado','Registro','Acción'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className="border-t">
          <td className="p-3 font-semibold">{row.serie}{row.numero ? `-${row.numero}` : ''}</td>
          <td className="p-3">{row.tipoGuia === '31' ? 'Transportista' : 'Remitente'}</td>
          <td className="p-3">{row.ambiente === 'TEST' ? 'Pruebas' : 'Producción'}</td>
          <td className="p-3">{states[row.estado] || row.estado}</td><td className="p-3">{row.fechaEnvio ? hoyPeru(new Date(row.fechaEnvio)) : '—'}</td>
          <td className="p-3"><Button variant="outline" disabled={Boolean(progress)} onClick={() => open(row)}>Ver</Button></td>
        </tr>)}
          {!rows.length && <tr><td colSpan={6} role="status" className="p-6 text-center text-slate-500">{failure || (loaded ? 'Sin guías registradas' : 'Cargando guías…')}</td></tr>}
        </tbody>
      </table>
      <div className="flex items-center justify-end gap-2 p-3 text-xs">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button><span>{page} / {totalPages}</span>
        <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
      </div>
    </Card>}
  </div>
}
