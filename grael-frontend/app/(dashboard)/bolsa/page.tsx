'use client'
import { useState } from 'react'
import { Briefcase, Plus, X, ChevronRight, Truck, Download, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, PageHeader, FormField, Input, Select } from '@/components/ui'
import { TICKETS_DB } from '@/lib/data'
import { useAuthStore } from '@/store'
import { formatMoney, ESTADO_COLORS } from '@/lib/utils'
import type { Ticket } from '@/types'

interface Bolsa { id:string; codigo:string; destino:string; fecha:string; estado:'ABIERTA'|'DESPACHADA'|'CERRADA'; tickets:Ticket[]; total:number }

const INIT: Bolsa[] = [
  { id:'b1', codigo:'BOL-2026-0018', destino:'LIMA',         fecha:'2026-02-24', estado:'ABIERTA',    tickets:TICKETS_DB.filter(t=>t.destino.nombre==='LIMA'),         total:TICKETS_DB.filter(t=>t.destino.nombre==='LIMA').reduce((s,t)=>s+t.total,0)         },
  { id:'b2', codigo:'BOL-2026-0017', destino:'QUILLABANBA',  fecha:'2026-02-24', estado:'ABIERTA',    tickets:TICKETS_DB.filter(t=>t.destino.nombre==='QUILLABANBA'),  total:TICKETS_DB.filter(t=>t.destino.nombre==='QUILLABANBA').reduce((s,t)=>s+t.total,0)  },
  { id:'b3', codigo:'BOL-2026-0015', destino:'AREQUIPA',     fecha:'2026-02-22', estado:'DESPACHADA', tickets:TICKETS_DB.filter(t=>t.destino.nombre==='AREQUIPA'),     total:TICKETS_DB.filter(t=>t.destino.nombre==='AREQUIPA').reduce((s,t)=>s+t.total,0)     },
]

function ModalAgregar({ bolsa, onAdd, onClose }: { bolsa:Bolsa; onAdd:(ts:Ticket[])=>void; onClose:()=>void }) {
  const [q,setQ]=useState(''); const [sel,setSel]=useState<Set<string>>(new Set())
  const avail = TICKETS_DB.filter(t => !t.anulado && t.destino.nombre===bolsa.destino && !bolsa.tickets.find(bt=>bt.id===t.id) && (q ? t.numeroTicket.includes(q)||t.remitente.razonSocial.toLowerCase().includes(q.toLowerCase()) : true))
  const toggle = (id:string) => setSel(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n })
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <div><h3 className="font-semibold text-[14px] text-navy-500">Agregar a {bolsa.codigo}</h3><p className="text-[11px] text-gray-400">Destino: {bolsa.destino}</p></div>
          <button onClick={onClose} className="text-gray-400"><X size={16}/></button>
        </div>
        <div className="p-3 border-b"><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar..." className="w-full"/></div>
        <div className="overflow-y-auto flex-1">
          {avail.length===0 ? <p className="py-8 text-center text-gray-400 text-[12px]">No hay tickets disponibles para {bolsa.destino}</p>
          : avail.map(t=>(
            <label key={t.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer">
              <input type="checkbox" checked={sel.has(t.id)} onChange={()=>toggle(t.id)} className="accent-sky-brand mt-0.5"/>
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-navy-500">{t.numeroTicket}</p>
                <p className="text-[11px] text-gray-600">{t.remitente.razonSocial} → {t.destinatario.razonSocial}</p>
              </div>
              <span className="text-[12px] font-bold text-navy-500">{formatMoney(t.total)}</span>
            </label>
          ))}
        </div>
        <div className="p-4 border-t flex items-center justify-between">
          <span className="text-[12px] text-gray-500">{sel.size} seleccionado(s)</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" disabled={sel.size===0} onClick={()=>{ onAdd(avail.filter(t=>sel.has(t.id))); onClose() }} icon={<Plus size={13}/>}>
              Agregar {sel.size>0?`(${sel.size})`:''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BolsaPage() {
  const token = useAuthStore(s => s.token)
  const isDemoMode = !token || token.startsWith('demo-')
  const [bolsas,setBolsas]=useState<Bolsa[]>(INIT)
  const [modal,setModal]=useState<Bolsa|null>(null)
  const [expanded,setExpanded]=useState<string|null>(null)
  const [showNew,setShowNew]=useState(false)
  const [newDest,setNewDest]=useState('CUSCO')

  const bloqueado = () => toast.error('MÓDULO LEGACY NO HABILITADO PARA OPERACIÓN REAL')

  const crear = () => {
    if (!isDemoMode) { bloqueado(); return }
    const code=`BOL-${new Date().getFullYear()}-${String(bolsas.length+1).padStart(4,'0')}`
    setBolsas(b=>[{ id:`b${Date.now()}`,codigo:code,destino:newDest,fecha:new Date().toISOString().split('T')[0],estado:'ABIERTA',tickets:[],total:0 },...b])
    setShowNew(false); toast.success(`Bolsa ${code} creada`)
  }
  const addTickets=(bolsaId:string,tickets:Ticket[])=>{
    if (!isDemoMode) { bloqueado(); return }
    setBolsas(bs=>bs.map(b=>b.id===bolsaId?{...b,tickets:[...b.tickets,...tickets],total:[...b.tickets,...tickets].reduce((s,t)=>s+t.total,0)}:b))
    toast.success(`${tickets.length} ticket(s) agregado(s)`)
  }
  const despachar=(id:string)=>{if (!isDemoMode) { bloqueado(); return }; setBolsas(bs=>bs.map(b=>b.id===id?{...b,estado:'DESPACHADA'}:b));toast.success('Bolsa despachada')}

  const DESTS=['CUSCO','LIMA','AREQUIPA','PIURA','QUILLABANBA','PUNO']

  return (
    <div className="pb-6">
      <PageHeader title="Bolsa de Despacho" actions={<Button variant="primary" size="sm" icon={<Plus size={13}/>} disabled={!isDemoMode} onClick={()=>isDemoMode ? setShowNew(true) : bloqueado()}>Nueva Bolsa</Button>}/>
      {!isDemoMode && <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] text-amber-900"><strong>MÓDULO LEGACY NO HABILITADO PARA OPERACIÓN REAL.</strong> Este módulo conserva solo una vista Demo; no se permiten acciones locales sin un contrato backend operativo.</div>}
      {showNew && (
        <Card className="mb-4 border-2 border-sky-brand/30 bg-blue-50/30">
          <div className="flex items-end gap-3 flex-wrap">
            <p className="text-[13px] font-semibold text-navy-500 self-end pb-1.5">Nueva bolsa →</p>
            <FormField label="Destino" className="w-[160px]"><Select value={newDest} onChange={e=>setNewDest(e.target.value)}>{DESTS.map(d=><option key={d}>{d}</option>)}</Select></FormField>
            <Button variant="primary" icon={<Plus size={13}/>} onClick={crear}>Crear</Button>
            <Button variant="ghost" onClick={()=>setShowNew(false)}>Cancelar</Button>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[{label:'Abiertas',v:bolsas.filter(b=>b.estado==='ABIERTA').length,c:'text-amber-600'},{label:'Despachadas',v:bolsas.filter(b=>b.estado==='DESPACHADA').length,c:'text-green-600'},{label:'Total tickets',v:bolsas.reduce((s,b)=>s+b.tickets.length,0),c:'text-navy-500'}].map(({label,v,c})=>(
          <Card key={label}><p className="text-[11px] text-gray-400 mb-1">{label}</p><p className={`text-[22px] font-black ${c}`}>{v}</p></Card>
        ))}
      </div>
      <div className="space-y-3">
        {bolsas.map(b=>{
          const isOpen=expanded===b.id
          const bultos=b.tickets.reduce((s,t)=>s+t.mercaderias.reduce((ss,m)=>ss+m.cantidad,0),0)
          const peso  =b.tickets.reduce((s,t)=>s+t.mercaderias.reduce((ss,m)=>ss+m.pesoTotal,0),0)
          return (
            <Card key={b.id} padding={false} className="overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={()=>setExpanded(isOpen?null:b.id)}>
                <ChevronRight size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen?'rotate-90':''}`}/>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
                  <div><p className="text-[12px] font-bold text-navy-500">{b.codigo}</p><p className="text-[10px] text-gray-400">{b.fecha}</p></div>
                  <p className="text-[11px] font-medium text-sky-brand">→ {b.destino}</p>
                  <p className="text-[12px] text-gray-600 hidden md:block">{b.tickets.length} tickets</p>
                  <p className="text-[11px] text-gray-500 hidden md:block">{bultos} bts · {peso}kg</p>
                  <div className="text-right">
                    <p className="text-[12px] font-bold text-navy-500">{formatMoney(b.total)}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.estado==='ABIERTA'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>{b.estado}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-2" onClick={e=>e.stopPropagation()}>
                  {b.estado==='ABIERTA' && <>
                    <button disabled={!isDemoMode} onClick={()=>isDemoMode ? setModal(b) : bloqueado()} className="px-2 py-1.5 text-[11px] bg-sky-brand text-white rounded hover:bg-sky-dark flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={11}/>Agregar</button>
                    <button disabled={!isDemoMode} onClick={()=>isDemoMode ? (b.tickets.length>0?despachar(b.id):toast.error('Agregue tickets')) : bloqueado()} className="px-2 py-1.5 text-[11px] bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"><Truck size={11}/>Despachar</button>
                  </>}
                  <button disabled={!isDemoMode} onClick={()=>isDemoMode ? toast(`Descargando ${b.codigo}`) : bloqueado()} className="p-1.5 text-gray-400 hover:text-navy-500 rounded disabled:cursor-not-allowed disabled:opacity-50"><Download size={13}/></button>
                </div>
              </div>
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  {b.tickets.length===0 ? (
                    <div className="py-8 text-center text-gray-400"><Package size={24} className="mx-auto mb-2 text-gray-200"/><p className="text-[12px]">Sin tickets</p></div>
                  ) : (
                    <table className="w-full border-collapse text-[11px]">
                      <thead><tr className="border-b border-gray-200">{['Ticket','Remitente','Destinatario','Mercadería','Peso','Monto'].map(h=><th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">{h}</th>)}</tr></thead>
                      <tbody>
                        {b.tickets.map(t=>{
                          const p=t.mercaderias.reduce((s,m)=>s+m.pesoTotal,0)
                          return <tr key={t.id} className="border-b border-gray-100 hover:bg-white">
                            <td className="px-3 py-2 font-semibold text-navy-500">{t.numeroTicket}</td>
                            <td className="px-3 py-2">{t.remitente.razonSocial}</td>
                            <td className="px-3 py-2">{t.destinatario.razonSocial}</td>
                            <td className="px-3 py-2 text-gray-600">{t.mercaderias.map(m=>m.tipo).join(', ')}</td>
                            <td className="px-3 py-2">{p}kg</td>
                            <td className="px-3 py-2 font-semibold text-navy-500">{formatMoney(t.total)}</td>
                          </tr>
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
      {modal && <ModalAgregar bolsa={modal} onAdd={ts=>addTickets(modal.id,ts)} onClose={()=>setModal(null)}/>}
    </div>
  )
}
