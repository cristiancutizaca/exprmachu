'use client'
import Link from 'next/link'
import {
  LayoutDashboard, Truck, ListOrdered, ArrowLeftRight,
  ClipboardList, Ship, Warehouse, FileText, Briefcase,
  StickyNote, Calculator, QrCode, Banknote, BarChart2, Settings,
  Route, CircleDollarSign, ShieldCheck, AlertTriangle
} from 'lucide-react'
import { useAuthStore, useUIStore } from '@/store'
import { TICKETS_DB, DESEMBARQUE_DB } from '@/lib/data'
import type { User } from '@/types'
import { clsx } from 'clsx'

type Role = User['rol']
type NavItem = { href: string; label: string; Icon: typeof LayoutDashboard; allowedRoles: Role[] }
type NavGroup = { group: string | null; items: NavItem[] }

const ALL_ROLES: Role[] = ['ADMIN_SEDE', 'OPERADOR', 'SUPERVISOR', 'CAJERO', 'ALMACEN', 'REPARTIDOR', 'AUDITOR', 'SUPERADMIN']
const NAV: NavGroup[] = [
  { group: null, items: [
    { href:'/dashboard', label:'Dashboard', Icon:LayoutDashboard, allowedRoles: ALL_ROLES },
  ]},
  { group:'Operaciones', items: [
    { href:'/recepcion',   label:'Recepcion de Carga', Icon:Truck,          allowedRoles:['ADMIN_SEDE','OPERADOR','SUPERVISOR','SUPERADMIN'] },
    { href:'/busqueda',    label:'Búsqueda de Ticket', Icon:ListOrdered,    allowedRoles: ALL_ROLES },
    { href:'/transbordo',  label:'Transbordo',         Icon:ArrowLeftRight, allowedRoles:['ADMIN_SEDE','SUPERVISOR','ALMACEN','SUPERADMIN'] },
    { href:'/manifiesto',  label:'Manifiesto',         Icon:ClipboardList,  allowedRoles:['ADMIN_SEDE','SUPERVISOR','ALMACEN','SUPERADMIN'] },
    { href:'/desembarque', label:'Desembarque',        Icon:Ship,           allowedRoles:['ADMIN_SEDE','SUPERVISOR','ALMACEN','SUPERADMIN'] },
    { href:'/inventario',  label:'Inventario',         Icon:Warehouse,      allowedRoles:['ADMIN_SEDE','SUPERVISOR','ALMACEN','SUPERADMIN'] },
    { href:'/reparto',     label:'Reparto',            Icon:Route,           allowedRoles:['ADMIN_SEDE','SUPERVISOR','REPARTIDOR','SUPERADMIN'] },
    { href:'/entregas',    label:'Entregas y POD',      Icon:Truck,          allowedRoles:['ADMIN_SEDE','SUPERVISOR','REPARTIDOR','SUPERADMIN'] },
  ]},
  { group:'Administración', items: [
    { href:'/comprobantes',         label:'Comprobantes',         Icon:FileText,        allowedRoles:['ADMIN_SEDE','CAJERO','SUPERVISOR','AUDITOR','SUPERADMIN'] },
    { href:'/bolsa',                label:'Bolsa',                Icon:Briefcase,       allowedRoles:['ADMIN_SEDE','SUPERVISOR','SUPERADMIN'] },
    { href:'/detraccion',           label:'Detracción',           Icon:StickyNote,      allowedRoles:['ADMIN_SEDE','CAJERO','SUPERVISOR','SUPERADMIN'] },
    { href:'/caja-diaria',          label:'Caja Diaria',          Icon:Calculator,      allowedRoles:['ADMIN_SEDE','CAJERO','SUPERVISOR','SUPERADMIN'] },
    { href:'/busqueda-qr',          label:'Búsqueda de QR',       Icon:QrCode,          allowedRoles: ALL_ROLES },
    { href:'/pago-sin-comprobante', label:'Pago sin Comprobante', Icon:Banknote,       allowedRoles:['ADMIN_SEDE','CAJERO','SUPERVISOR','SUPERADMIN'] },
    { href:'/egresos',              label:'Egresos',              Icon:CircleDollarSign, allowedRoles:['ADMIN_SEDE','CAJERO','SUPERVISOR','SUPERADMIN'] },
    { href:'/incidencias',          label:'Incidencias',           Icon:AlertTriangle,   allowedRoles: ALL_ROLES },
  ]},
  { group:'Sistema', items: [
    { href:'/reportes',      label:'Reportes',      Icon:BarChart2,   allowedRoles:['ADMIN_SEDE','CAJERO','SUPERVISOR','AUDITOR','SUPERADMIN'] },
    { href:'/configuracion', label:'Configuración', Icon:Settings,    allowedRoles:['ADMIN_SEDE','SUPERVISOR','SUPERADMIN'] },
    { href:'/auditoria',     label:'Auditoría',     Icon:ShieldCheck, allowedRoles:['ADMIN_SEDE','SUPERVISOR','AUDITOR','SUPERADMIN'] },
  ]},
]

function getBadge(href: string, isDemoMode: boolean) {
  if (!isDemoMode) return null
  if (href==='/busqueda')    { const n=TICKETS_DB.filter(t=>!t.pagado&&!t.anulado).length;     return n>0?{count:n,cls:'bg-amber-100 text-amber-700'}:null }
  if (href==='/desembarque') { const n=DESEMBARQUE_DB.filter(d=>d.estado==='PENDIENTE_VERIFICACION').length; return n>0?{count:n,cls:'bg-indigo-100 text-indigo-700'}:null }
  if (href==='/inventario')  { const n=DESEMBARQUE_DB.filter(d=>d.estado==='PENDIENTE_VERIFICACION').length; return n>0?{count:n,cls:'bg-blue-100 text-blue-700'}:null }
  return null
}

export default function Sidebar({ currentPath }: { currentPath: string }) {
  const drawerOpen = useUIStore(s => s.drawerOpen)
  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  const isDemoMode = !token || token.startsWith('demo-')
  const role = user?.rol as Role | undefined
  return (
    <>
      {drawerOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-x-0 top-[92px] bottom-0 z-40 bg-black/30"
          onClick={() => useUIStore.getState().setDrawerOpen(false)}
        />
      )}
      <aside
        aria-label="Menú Operaciones"
        className={clsx(
          'fixed top-[92px] left-0 bottom-0 z-50 w-[300px] max-w-[calc(100vw-24px)] bg-white border-r border-gray-200',
          'shadow-[2px_0_12px_rgba(0,0,0,0.12)] overflow-hidden drawer-transition transform',
          drawerOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        )}>
        <div className="w-full h-full overflow-y-auto pb-6">
          {NAV.map(({ group, items }) => (
            <div key={group||'home'} className="mb-1">
              {group && (
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.14em] px-4 pt-4 pb-1">
                  {group}
                </p>
              )}
              {items.filter(item => !role || item.allowedRoles.includes(role) || role === 'SUPERADMIN').map(({ href, label, Icon }) => {
                const active = currentPath === href || (href !== '/dashboard' && currentPath.startsWith(href))
                const badge  = getBadge(href, isDemoMode)
                return (
                  <Link key={href} href={href} onClick={() => useUIStore.getState().setDrawerOpen(false)} className={clsx(
                    'flex items-center gap-2.5 px-4 py-2 text-[12.5px] transition-all border-l-[3px] group',
                    active ? 'bg-blue-50 text-navy-500 border-l-subbar font-semibold'
                           : 'text-gray-500 border-l-transparent hover:bg-blue-50/50 hover:text-navy-500 hover:border-l-sky-brand'
                  )}>
                    <Icon size={14} className={clsx('flex-shrink-0 transition-colors', active?'text-subbar':'text-gray-400 group-hover:text-subbar')}/>
                    <span className="flex-1 truncate">{label}</span>
                    {badge && (
                      <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0', badge.cls)}>
                        {badge.count}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
          <div className="mx-4 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-[10px] font-bold text-navy-500">GRAEL Sistema V7</p>
            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block"/>
              Conectado · {new Date().toLocaleDateString('es-PE')}
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
