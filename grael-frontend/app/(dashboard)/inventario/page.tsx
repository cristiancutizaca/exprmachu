'use client'
import { useCallback, useEffect, useState } from 'react'
import { Warehouse, Search, Package, Clock, CheckCircle, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, PageHeader, FormField, Input, Select } from '@/components/ui'
import { INVENTARIO_DB } from '@/lib/data'
import { bultosApi, inventarioApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import type { ItemInventario } from '@/lib/data'

const ESTADO_STYLE = {
  EN_ALMACEN: { label:'En Almacén', bg:'bg-blue-100', text:'text-blue-700' },
  RECOGIDO:   { label:'Recogido',   bg:'bg-green-100',text:'text-green-700' },
  DEVUELTO:   { label:'Devuelto',   bg:'bg-gray-100', text:'text-gray-600' },
  OBSERVADO:  { label:'Observado',  bg:'bg-amber-100', text:'text-amber-700' },
  FALTANTE:   { label:'Faltante',   bg:'bg-red-100',   text:'text-red-700' },
}

export default function InventarioPage() {
  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  const isDemoMode = !token || token.startsWith('demo-')
  const [items, setItems] = useState<ItemInventario[]>(INVENTARIO_DB)
  const [filtro, setFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [loading, setLoading] = useState(false)

  const cargarInventario = useCallback(async () => {
    if (isDemoMode) { setItems(INVENTARIO_DB); return }
    setLoading(true)
    try {
      const response = await inventarioApi.listarBultos({ sedeId: user?.sedeId || undefined, estado: estadoFiltro || undefined, limit: 100 })
      const rows = response.data?.data || []
      setItems(rows.map((b: any) => ({
        id: b.id, numeroTicket: b.ticket?.numeroTicket || b.ticketId, mercaderia: b.tipo || 'Carga', descripcion: b.descripcion || '—',
        remitente: b.ticket?.remitente?.razonSocial || '—', destinatario: b.ticket?.destinatario?.razonSocial || '—',
        origen: b.ticket?.origen?.nombre || '—', destino: b.ticket?.destino?.nombre || '—', ubicacion: b.ubicacionActual?.codigo || 'Sin ubicación',
        bultos: Number(b.cantidad || 1), peso: Number(b.pesoReal || 0), estado: b.estado === 'ENTREGADO' ? 'RECOGIDO' : b.estado === 'DEVUELTO' ? 'DEVUELTO' : 'EN_ALMACEN',
        diasEnAlmacen: Math.max(0, Math.floor((Date.now() - new Date(b.createdAt).getTime()) / 86400000)),
      })))
    } catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo cargar el inventario real') }
    finally { setLoading(false) }
  }, [estadoFiltro, isDemoMode, user?.sedeId])

  useEffect(() => { cargarInventario() }, [cargarInventario])

  const cambiarEstado = async (item: ItemInventario, estado: 'ENTREGADO' | 'DEVUELTO') => {
    if (isDemoMode) {
      setItems(prev => prev.map(current => current.id === item.id ? { ...current, estado: estado === 'ENTREGADO' ? 'RECOGIDO' : 'DEVUELTO' } : current))
      toast.success(estado === 'ENTREGADO' ? 'Marcado como recogido' : 'Marcado como devuelto')
      return
    }
    try { await bultosApi.cambiarEstado(item.id, estado, estado === 'ENTREGADO' ? 'Recojo en agencia' : 'Devolución'); await cargarInventario(); toast.success('Estado actualizado') }
    catch (error: any) { toast.error(error.response?.data?.message || 'No se pudo actualizar el bulto') }
  }

  const filtrados = filtro
    ? items.filter(i =>
        i.numeroTicket.includes(filtro) ||
        i.destinatario.toLowerCase().includes(filtro.toLowerCase()) ||
        i.remitente.toLowerCase().includes(filtro.toLowerCase()) ||
        i.ubicacion.toLowerCase().includes(filtro.toLowerCase())
      )
    : items

  const enAlmacen = items.filter(i=>i.estado==='EN_ALMACEN').length
  const totalBultos = items.filter(i=>i.estado==='EN_ALMACEN').reduce((s,i)=>s+i.bultos,0)
  const totalPeso   = items.filter(i=>i.estado==='EN_ALMACEN').reduce((s,i)=>s+i.peso,0)
  const vencidos    = items.filter(i=>i.estado==='EN_ALMACEN'&&i.diasEnAlmacen>3).length

  return (
    <div className="pb-6">
      <PageHeader title="Inventario de Almacén" subtitle={isDemoMode ? 'Modo Demo — datos locales' : 'Sesión real — datos del API'} actions={
        <Button variant="secondary" size="sm" onClick={()=>toast('Exportando...')}>Exportar</Button>
      }/>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label:'En almacén',    value:enAlmacen,              color:'text-blue-600'  },
          { label:'Total bultos',  value:totalBultos,            color:'text-navy-500'  },
          { label:'Peso total',    value:`${totalPeso} kg`,      color:'text-gray-700'  },
          { label:'+3 días sin recoger', value:vencidos,         color:'text-red-600'   },
        ].map(({label,value,color})=>(
          <Card key={label}>
            <p className="text-[11px] text-gray-400 mb-1">{label}</p>
            <p className={`text-[22px] font-black ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <div className="flex gap-2.5 items-end flex-wrap">
          <FormField label="Buscar" className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
              <Input value={filtro} onChange={e=>setFiltro(e.target.value)}
                className="pl-7 w-full" placeholder="Ticket, destinatario, ubicación..."/>
            </div>
          </FormField>
          <FormField label="Estado" className="w-[170px]">
            <Select value={estadoFiltro} onChange={e=>setEstadoFiltro(e.target.value)}><option value="">Todos</option><option value="EN_ALMACEN">En almacén</option><option value="ENTREGADO">Entregado</option><option value="DEVUELTO">Devuelto</option><option value="OBSERVADO">Observado</option><option value="FALTANTE">Faltante</option></Select>
          </FormField>
          <Button variant="primary" icon={<Search size={13}/>} onClick={()=>void cargarInventario()} loading={loading}>Buscar</Button>
        </div>
      </Card>

      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                {['Estado','Ticket','Mercadería','Remitente','Destinatario','Ruta','Ubic.','Bultos','Peso','Días','Acciones'].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(item => {
                const est = ESTADO_STYLE[item.estado]
                const alerta = item.estado === 'EN_ALMACEN' && item.diasEnAlmacen > 3
                return (
                  <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50 ${alerta?'bg-red-50/30':''}`}>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${est.bg} ${est.text}`}>
                        {est.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold text-navy-500 text-[12px]">{item.numeroTicket}</td>
                    <td className="px-3 py-3">
                      <p className="text-[11px] font-medium text-gray-700">{item.mercaderia}</p>
                      <p className="text-[10px] text-gray-500">{item.descripcion}</p>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-gray-600">{item.remitente}</td>
                    <td className="px-3 py-3 text-[11px] text-gray-600">{item.destinatario}</td>
                    <td className="px-3 py-3">
                      <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                        {item.origen} → {item.destino}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {item.ubicacion}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[12px] font-bold text-center">{item.bultos}</td>
                    <td className="px-3 py-3 text-[12px] text-center">{item.peso} kg</td>
                    <td className="px-3 py-3 text-center">
                      {item.estado === 'EN_ALMACEN' ? (
                        <span className={`text-[12px] font-bold ${alerta?'text-red-600':'text-gray-700'}`}>
                          {item.diasEnAlmacen === 0 ? 'Hoy' : `${item.diasEnAlmacen}d`}
                          {alerta && ' ⚠'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        {item.estado === 'EN_ALMACEN' && (
                          <button onClick={()=>cambiarEstado(item, 'ENTREGADO') }
                            className="px-2 py-1 bg-green-600 text-white text-[10px] rounded hover:bg-green-700 flex items-center gap-1">
                            <CheckCircle size={10}/> Recogido
                          </button>
                        )}
                        {item.estado === 'EN_ALMACEN' && (
                          <button onClick={()=>cambiarEstado(item, 'DEVUELTO') }
                            className="px-2 py-1 bg-gray-200 text-gray-600 text-[10px] rounded hover:bg-gray-300 flex items-center gap-1">
                            <RotateCcw size={10}/> Dev.
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-[11px] text-gray-500">
          {filtrados.length} item(s) en almacén
        </div>
      </Card>
    </div>
  )
}
