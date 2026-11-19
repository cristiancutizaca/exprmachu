'use client'
import { isDemoSession } from '@/lib/demo-session'
import { useEffect, useState } from 'react'
import {
  Settings, Save, User, MapPin, DollarSign, Truck,
  Bell, Shield, Database, ChevronRight, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, PageHeader, FormField, Input, Select } from '@/components/ui'
import { useAuthStore } from '@/store'
import { authApi, catalogosV2Api, configuracionApi } from '@/lib/api'

const SECCIONES = [
  { id:'sede',     label:'Datos de Sede',        icon:MapPin,    color:'text-navy-500'  },
  { id:'tarifas',  label:'Tarifas y Costos',      icon:DollarSign,color:'text-green-600' },
  { id:'sistema',  label:'Sistema',               icon:Settings,  color:'text-gray-600'  },
  { id:'notif',    label:'Notificaciones',         icon:Bell,      color:'text-sky-brand' },
  { id:'seguridad',label:'Seguridad',             icon:Shield,    color:'text-red-500'   },
]

type SedeUi = { id: string; nombre: string; ruc?: string; direccion?: string; telefono?: string; correo?: string; departamento?: string }
const sedeVacia = { nombre: '', ruc: '', direccion: '', telefono: '', email: '', ciudad: '', igv: '' }

type TarifaUi = {
  id: string; origenId: string; destinoId: string; tipoMercaderia: string
  origen?: { nombre?: string }; destino?: { nombre?: string }
  precioKg: number; precioVolumen: number; precioMinimo: number
  recargoReparto: number; recargoFragil: number; recargoExpress: number
  porcentajeSeguro: number; vigenciaDesde?: string; vigenciaHasta?: string; activo: boolean
}

export default function ConfiguracionPage() {
  const { user, token } = useAuthStore()
  const isDemoMode = isDemoSession(token)
  const [seccion, setSeccion] = useState('sede')
  const [saving, setSaving]   = useState(false)
  const [saved,  setSaved]    = useState(false)

  // Sede
  const [sede, setSede] = useState(sedeVacia)
  const [sedes, setSedes] = useState<SedeUi[]>([])
  const [loaded, setLoaded] = useState(isDemoMode)
  const [loadError, setLoadError] = useState('')
  const [attempt, retry] = useState(0)

  // Tarifas
  const [tarifas, setTarifas] = useState<TarifaUi[]>([])
  const [tarifasEditadas, setTarifasEditadas] = useState<Set<string>>(new Set())
  const canEditNational = user?.rol === 'SUPERVISOR' || user?.rol === 'SUPERADMIN'
  const [sedeId, setSedeId] = useState<string | null>(user?.sedeId || null)

  // Sistema
  const [sistema, setSistema] = useState({
    moneda:         'PEN',
    zona_horaria:   'America/Lima',
    formato_fecha:  'DD/MM/YYYY',
    tickets_por_pagina: '20',
    dias_vencimiento: '3',
    imprimir_auto:  'false',
  })

  // Notificaciones
  const [notif, setNotif] = useState({
    cobros_pendientes:    true,
    nuevos_tickets:       false,
    desembarque_pendiente:true,
    alerta_dias_almacen:  true,
    sonido:               false,
  })

  // Seguridad
  const [passForm, setPassForm] = useState({ actual:'', nueva:'', confirmar:'' })
  const [savingPassword, setSavingPassword] = useState(false)

  function elegirSede(site?: SedeUi) {
    setSedeId(site?.id || null)
    setSede(current => ({ ...sedeVacia, igv: current.igv, nombre: site?.nombre ?? '', ruc: site?.ruc ?? '',
      direccion: site?.direccion ?? '', telefono: site?.telefono ?? '', email: site?.correo ?? '', ciudad: site?.departamento ?? '' }))
  }

  useEffect(() => {
    if (isDemoMode) return
    let active = true
    setLoaded(false)
    setLoadError('')
    Promise.all([
      configuracionApi.all(),
      catalogosV2Api.sedes({ activo: true }),
      catalogosV2Api.tarifas({ activo: true }),
    ]).then(([configResponse, sedesResponse, tarifasResponse]) => {
      if (!active) return
      const values = configResponse.data || {}
      const sites: SedeUi[] = sedesResponse.data || []
      setSedes(sites)
      elegirSede(sites.find(site => site.id === user?.sedeId) || (sites.length === 1 ? sites[0] : undefined))
      const realTarifas = (tarifasResponse.data || []) as TarifaUi[]
      setTarifas(realTarifas)
      setSede(current => ({ ...current, igv: values['sistema.igv'] ?? '18' }))
      setSistema(current => ({ ...current, ...Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith('sistema.')).map(([key, value]) => [key.replace('sistema.', ''), value])) }))
      setNotif(current => Object.fromEntries(Object.entries(current).map(([key, fallback]) => [key, values['notif.' + key] == null ? fallback : values['notif.' + key] === 'true'])) as typeof current)
      setLoaded(true)
    }).catch(error => { if (active) setLoadError(error.response?.data?.message || 'No se pudo cargar configuración real') })
    return () => { active = false }
  }, [isDemoMode, user?.sedeId, attempt])

  const handlePasswordChange = async () => {
    if (!passForm.actual || passForm.nueva.length < 8 || passForm.nueva !== passForm.confirmar) return
    if (isDemoMode) {
      toast.success('Demo: cambio de contraseña simulado; no se escribió PostgreSQL')
      setPassForm({ actual:'', nueva:'', confirmar:'' })
      return
    }
    setSavingPassword(true)
    try {
      await authApi.cambiarPassword(passForm.actual, passForm.nueva)
      toast.success('Contraseña actualizada correctamente')
      setPassForm({ actual:'', nueva:'', confirmar:'' })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo actualizar la contraseña')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSave = async () => {
    if (!isDemoMode && !canEditNational) {
      toast('Tu rol tiene acceso de lectura en Configuración. No se enviaron cambios al servidor.')
      return
    }
    setSaving(true)
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 350))
      } else {
        if (seccion === 'sede' && sedeId) {
          const site = (await catalogosV2Api.actualizarSede(sedeId, { nombre: sede.nombre, ruc: sede.ruc,
            direccion: sede.direccion, telefono: sede.telefono, correo: sede.email, departamento: sede.ciudad })).data as SedeUi
          setSedes(rows => rows.map(row => row.id === site.id ? site : row))
        }
        if (seccion === 'tarifas') {
          const updates = tarifas.filter(tarifa => tarifasEditadas.has(tarifa.id))
          for (const tarifa of updates) {
            await catalogosV2Api.actualizarTarifa(tarifa.id, { precioKg: tarifa.precioKg, precioVolumen: tarifa.precioVolumen,
              precioMinimo: tarifa.precioMinimo, recargoReparto: tarifa.recargoReparto, recargoExpress: tarifa.recargoExpress })
            setTarifasEditadas(current => new Set([...current].filter(id => id !== tarifa.id)))
          }
        }
        if (seccion === 'sistema') await configuracionApi.bulk([
          { clave: 'sistema.igv', valor: sede.igv },
          ...Object.entries(sistema).filter(([key]) => key !== 'igv').map(([clave, valor]) => ({ clave: `sistema.${clave}`, valor: String(valor) })),
        ])
        if (seccion === 'notif') await configuracionApi.bulk(
          Object.entries(notif).map(([key, value]) => ({ clave: 'notif.' + key, valor: String(value) })),
        )
      }
      setSaved(true)
      toast.success(isDemoMode ? 'Configuración guardada en Demo' : 'Configuración guardada en el API')
      setTimeout(() => setSaved(false), 3000)
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo guardar la configuración') }
    finally { setSaving(false) }
  }

  if (!loaded) return <Card>{loadError ? <><p role="alert">{loadError}</p><Button onClick={() => retry(n => n + 1)}>Reintentar</Button></> : <p role="status">Cargando configuración…</p>}</Card>
  return (
    <div className="pb-8">
      <PageHeader
        title="Configuración"
        subtitle={isDemoMode ? 'Modo Demo — cambios locales' : 'Sesión real — cambios persistidos en PostgreSQL'}
        actions={
          <Button variant="primary" size="sm" loading={saving}
            icon={saved ? <Check size={13}/> : <Save size={13}/>}
            onClick={handleSave}
            disabled={seccion === 'seguridad' || (!isDemoMode && (!canEditNational || (seccion === 'sede' && !sedeId) || (seccion === 'tarifas' && tarifasEditadas.size === 0)))}
            className={saved ? '!bg-green-600' : ''}>
            {saved ? 'Guardado' : 'Guardar cambios'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar de secciones */}
        <div className="lg:col-span-1">
          <Card>
            <nav className="space-y-0.5">
              {SECCIONES.map(s => (
                <button key={s.id} onClick={() => setSeccion(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12.5px]
                              transition-all text-left group ${
                    seccion === s.id
                      ? 'bg-navy-50 text-navy-500 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <s.icon size={14} className={seccion === s.id ? s.color : 'text-gray-400 group-hover:text-gray-600'}/>
                  <span className="flex-1">{s.label}</span>
                  <ChevronRight size={12} className={seccion === s.id ? 'text-navy-400' : 'text-gray-200'}/>
                </button>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t">
              <p className="text-[10px] text-gray-400 px-3 mb-1">Usuario activo</p>
              <div className="flex items-center gap-2.5 px-3">
                <div className="w-7 h-7 bg-navy-500 rounded-full flex items-center justify-center text-white text-[11px] font-bold">
                  {(user?.nombre?.[0]||'G')}{(user?.apellido?.[0]||'R')}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-700">{user?.nombre} {user?.apellido}</p>
                  <p className="text-[10px] text-gray-400">{user?.rol?.replace('_',' ')}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Contenido */}
        <div className="lg:col-span-3 space-y-4">

          {/* ── DATOS DE SEDE ─────────────────────────────────────────────── */}
          {seccion === 'sede' && (
            <Card>
              {!isDemoMode && <label className="mb-4 block max-w-md text-sm">
                Sede a configurar
                <Select value={sedeId ?? ''} onChange={event => elegirSede(sedes.find(site => site.id === event.target.value))}>
                  <option value="">Seleccione la sede</option>
                  {sedes.map(site => <option key={site.id} value={site.id}>{site.nombre}</option>)}
                </Select>
              </label>}
              <h3 className="text-[14px] font-semibold text-gray-700 mb-4 pb-2 border-b">Datos de la Sede</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Nombre de la agencia" className="md:col-span-2">
                  <Input disabled={!isDemoMode && !canEditNational} value={sede.nombre} onChange={e=>setSede(s=>({...s,nombre:e.target.value}))}/>
                </FormField>
                <FormField label="RUC">
                  <Input disabled={!isDemoMode && !canEditNational} value={sede.ruc} onChange={e=>setSede(s=>({...s,ruc:e.target.value}))} maxLength={11}/>
                </FormField>
                <FormField label="Ciudad / Sede">
                  <Input disabled={!isDemoMode && !canEditNational} value={sede.ciudad} onChange={e=>setSede(s=>({...s,ciudad:e.target.value}))}/>
                </FormField>
                <FormField label="Dirección" className="md:col-span-2">
                  <Input aria-label="Dirección de la sede" disabled={!isDemoMode && !canEditNational} value={sede.direccion} onChange={e=>setSede(s=>({...s,direccion:e.target.value}))}/>
                </FormField>
                <FormField label="Teléfono">
                  <Input disabled={!isDemoMode && !canEditNational} value={sede.telefono} onChange={e=>setSede(s=>({...s,telefono:e.target.value}))}/>
                </FormField>
                <FormField label="Email">
                  <Input disabled={!isDemoMode && !canEditNational} type="email" value={sede.email} onChange={e=>setSede(s=>({...s,email:e.target.value}))}/>
                </FormField>

              </div>
            </Card>
          )}

          {/* ── TARIFAS ───────────────────────────────────────────────────── */}
          {seccion === 'tarifas' && (
            <Card>
              <div className="flex items-center justify-between mb-4 pb-2 border-b"><div><h3 className="text-[14px] font-semibold text-gray-700">Tarifas por ruta</h3><p className="text-[11px] text-gray-400">Origen → destino · tarifa específica persistida</p></div><span className="text-[11px] text-gray-500">{tarifas.length} rutas</span></div>
              {!isDemoMode && !canEditNational && <div className="mb-3 p-2.5 rounded-lg bg-amber-50 text-[11px] text-amber-800">ADMIN_SEDE tiene acceso de lectura. La edición nacional está reservada a SUPERVISOR/SUPERADMIN.</div>}
              <div className="overflow-x-auto"><table className="w-full text-[11px]"><thead><tr className="bg-gray-50 text-gray-500 uppercase"><th className="p-2 text-left">Ruta / tipo</th><th className="p-2">Kg</th><th className="p-2">Volumen</th><th className="p-2">Mínimo</th><th className="p-2">Reparto</th><th className="p-2">Express</th><th className="p-2">Vigencia</th></tr></thead><tbody>{tarifas.map(tarifa => <tr key={tarifa.id} className="border-b"><td className="p-2"><strong>{tarifa.origen?.nombre || tarifa.origenId} → {tarifa.destino?.nombre || tarifa.destinoId}</strong><br/><span className="text-gray-400">{tarifa.tipoMercaderia}</span></td>{(['precioKg','precioVolumen','precioMinimo','recargoReparto','recargoExpress'] as const).map(field => <td key={field} className="p-2"><Input aria-label={tarifa.tipoMercaderia + ' · ' + field} type="number" step="0.0001" min="0" disabled={!isDemoMode && !canEditNational} value={String(tarifa[field] ?? 0)} onChange={e => { setTarifas(rows => rows.map(row => row.id === tarifa.id ? { ...row, [field]: Number(e.target.value) } : row)); setTarifasEditadas(ids => new Set(ids).add(tarifa.id)) }} className="w-20 text-right"/></td>)}<td className="p-2">{tarifa.vigenciaDesde || '—'}<br/>{tarifa.activo ? 'ACTIVA' : 'INACTIVA'}</td></tr>)}</tbody></table></div>
              {!tarifas.length && <p className="py-8 text-center text-[12px] text-gray-400">No hay tarifas de ruta para la consulta actual.</p>}
              <div className="mt-4 pt-3 border-t"><p className="text-[11px] text-gray-400">{isDemoMode ? 'Modo Demo: no se escribe PostgreSQL.' : 'Los cambios se guardan en la tarifa específica seleccionada; no se agrupan por tipo de mercadería.'}</p></div>
            </Card>
          )}

          {/* ── SISTEMA ───────────────────────────────────────────────────── */}
          {seccion === 'sistema' && (
            <Card>
                <FormField label="IGV general (%)">
                  <Input disabled={!isDemoMode && !canEditNational} type="number" value={sede.igv} onChange={e=>setSede(s=>({...s,igv:e.target.value}))} min={0} max={30}/>
                </FormField>
              <h3 className="text-[14px] font-semibold text-gray-700 mb-4 pb-2 border-b">Preferencias del sistema</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Moneda">
                  <Select disabled={!isDemoMode && !canEditNational} value={sistema.moneda} onChange={e=>setSistema(s=>({...s,moneda:e.target.value}))}>
                    <option value="PEN">PEN — Sol Peruano</option>
                    <option value="USD">USD — Dólar</option>
                  </Select>
                </FormField>
                <FormField label="Zona horaria">
                  <Select disabled={!isDemoMode && !canEditNational} value={sistema.zona_horaria} onChange={e=>setSistema(s=>({...s,zona_horaria:e.target.value}))}>
                    <option value="America/Lima">America/Lima (UTC-5)</option>
                    <option value="America/Bogota">America/Bogota</option>
                  </Select>
                </FormField>
                <FormField label="Formato de fecha">
                  <Select disabled={!isDemoMode && !canEditNational} value={sistema.formato_fecha} onChange={e=>setSistema(s=>({...s,formato_fecha:e.target.value}))}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </Select>
                </FormField>
                <FormField label="Tickets por página">
                  <Select disabled={!isDemoMode && !canEditNational} value={sistema.tickets_por_pagina} onChange={e=>setSistema(s=>({...s, tickets_por_pagina:e.target.value}))}>
                    {['10','20','50','100'].map(n=><option key={n}>{n}</option>)}
                  </Select>
                </FormField>
                <FormField label="Días en almacén (alerta)" className="md:col-span-2">
                  <div className="flex items-center gap-3">
                    <Input type="number" min={1} max={30} value={sistema.dias_vencimiento}
                      disabled={!isDemoMode && !canEditNational} onChange={e=>setSistema(s=>({...s,dias_vencimiento:e.target.value}))}
                      className="w-24"/>
                    <p className="text-[11px] text-gray-400">días sin ser recogida para mostrar alerta en Inventario</p>
                  </div>
                </FormField>
                <div className="md:col-span-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input type="checkbox"
                    checked={sistema.imprimir_auto === 'true'}
                    disabled={!isDemoMode && !canEditNational} onChange={e=>setSistema(s=>({...s,imprimir_auto:e.target.checked?'true':'false'}))}
                    className="accent-sky-brand w-4 h-4"/>
                  <div>
                    <p className="text-[12px] font-medium text-gray-700">Imprimir ticket automáticamente al guardar</p>
                    <p className="text-[11px] text-gray-400">Abrirá la ventana de impresión después de registrar cada recepción</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ── NOTIFICACIONES ────────────────────────────────────────────── */}
          {seccion === 'notif' && (
            <Card>
              <h3 className="text-[14px] font-semibold text-gray-700 mb-4 pb-2 border-b">Preferencias de notificaciones</h3>
              <div className="space-y-3">
                {[
                  { key:'cobros_pendientes',     label:'Cobros pendientes',            desc:'Alerta cuando hay tickets sin pagar' },
                  { key:'nuevos_tickets',         label:'Nuevos tickets recibidos',     desc:'Notificar cuando llega nueva carga' },
                  { key:'desembarque_pendiente',  label:'Desembarque pendiente',        desc:'Recordatorio de carga por verificar/entregar' },
                  { key:'alerta_dias_almacen',    label:'Alerta de almacén',            desc:`Carga con más de ${sistema.dias_vencimiento} días sin recoger` },
                  { key:'sonido',                 label:'Sonido de notificaciones',     desc:'Reproducir sonido al recibir notificaciones' },
                ].map(item => (
                  <div key={item.key} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="text-[12px] font-medium text-gray-700">{item.label}</p>
                      <p className="text-[11px] text-gray-400">{item.desc}</p>
                    </div>
                    <label className="relative w-10 h-5 cursor-pointer flex-shrink-0">
                      <input type="checkbox" className="sr-only"
                        checked={(notif as any)[item.key]}
                        disabled={!isDemoMode && !canEditNational} onChange={e=>setNotif(n=>({...n,[item.key]:e.target.checked}))}/>
                      <div className={`w-10 h-5 rounded-full transition-colors ${(notif as any)[item.key] ? 'bg-sky-brand' : 'bg-gray-300'}`}/>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(notif as any)[item.key] ? 'translate-x-5' : 'translate-x-0'}`}/>
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── SEGURIDAD ─────────────────────────────────────────────────── */}
          {seccion === 'seguridad' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-[14px] font-semibold text-gray-700 mb-4 pb-2 border-b">Cambiar contraseña</h3>
                <div className="space-y-3 max-w-sm">
                  <FormField label="Contraseña actual">
                    <Input type="password" value={passForm.actual}
                      onChange={e=>setPassForm(f=>({...f,actual:e.target.value}))}
                      placeholder="••••••••"/>
                  </FormField>
                  <FormField label="Nueva contraseña">
                    <Input type="password" value={passForm.nueva}
                      onChange={e=>setPassForm(f=>({...f,nueva:e.target.value}))}
                      placeholder="Mínimo 8 caracteres"/>
                  </FormField>
                  <FormField label="Confirmar contraseña">
                    <Input type="password" value={passForm.confirmar}
                      onChange={e=>setPassForm(f=>({...f,confirmar:e.target.value}))}
                      placeholder="Repetir nueva contraseña"/>
                  </FormField>
                  {passForm.nueva && passForm.confirmar && passForm.nueva !== passForm.confirmar && (
                    <p className="text-red-500 text-[11px]">Las contraseñas no coinciden</p>
                  )}
                  <Button variant="primary" size="sm" loading={savingPassword}
                    disabled={!passForm.actual || passForm.nueva.length < 8 || passForm.nueva !== passForm.confirmar}
                    onClick={handlePasswordChange}>
                    Actualizar contraseña
                  </Button>
                </div>
              </Card>
              <Card>
                <h3 className="text-[14px] font-semibold text-gray-700 mb-3">Información de sesión</h3>
                <div className="space-y-2 text-[12px]">
                  {[
                    { label:'Usuario',    value: user?.username },
                    { label:'Nombre',     value: `${user?.nombre} ${user?.apellido}` },
                    { label:'Rol',        value: user?.rol?.replace('_',' ') },
                    { label:'Sede',       value: user?.sede },
                    { label:'Sesión',     value: 'Activa (8h)' },
                  ].map(({label,value})=>(
                    <div key={label} className="flex justify-between border-b border-gray-50 pb-1.5">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-gray-700">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
