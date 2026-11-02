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
    { href:'/dashboard', label:'Centro de operaciones', Icon:LayoutDashboard, allowedRoles: ALL_ROLES },
  ]},
  { group:'Operaciones', items: [
    { href:'/recepcion',   label:'Recepción de carga', Icon:Truck,          allowedRoles:['ADMIN_SEDE','OPERADOR','SUPERVISOR','SUPERADMIN'] },
    { href:'/busqueda',    label:'Búsqueda de Ticket', Icon:ListOrdered,    allowedRoles: ALL_ROLES },
    { href:'/transbordo',  label:'Transbordo',         Icon:ArrowLeftRight, allowedRoles:['ADMIN_SEDE','SUPERVISOR','ALMACEN','SUPERADMIN'] },
    { href:'/manifiesto',  label:'Manifiesto',         Icon:ClipboardList,  allowedRoles:['ADMIN_SEDE','SUPERVISOR','ALMACEN','SUPERADMIN'] },
    { href:'/desembarque', label:'Desembarque',        Icon:Ship,           allowedRoles:['ADMIN_SEDE','SUPERVISOR','ALMACEN','SUPERADMIN'] },
    { href:'/inventario',  label:'Inventario',         Icon:Warehouse,      allowedRoles:['ADMIN_SEDE','SUPERVISOR','ALMACEN','SUPERADMIN'] },
    { href:'/reparto',     label:'Reparto',            Icon:Route,           allowedRoles:['ADMIN_SEDE','SUPERVISOR','REPARTIDOR','SUPERADMIN'] },
    { href:'/entregas',    label:'Entregas y POD',      Icon:Truck,          allowedRoles:['ADMIN_SEDE','OPERADOR','SUPERVISOR','REPARTIDOR','SUPERADMIN'] },
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

/** La navegación del cliente mejora UX; los guards del backend siguen siendo autoridad. */
export function canAccessRoute(rol: string | undefined, pathname: string): boolean {
  if (!rol) return false
  const match = NAV.flatMap(group => group.items).find(item => pathname === item.href || pathname.startsWith(`${item.href}/`))
  return Boolean(match && (rol === 'SUPERADMIN' || match.allowedRoles.includes(rol as Role)))
}

export function defaultRouteForRole(rol: string | undefined): string {
  if (!rol) return '/login'
  if (rol === 'CAJERO') return '/caja-diaria'
  if (rol === 'OPERADOR') return '/recepcion'
  if (rol === 'REPARTIDOR') return '/reparto'
  if (rol === 'ALMACEN') return '/inventario'
  if (rol === 'AUDITOR') return '/auditoria'
  return '/dashboard'
}

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
          'fixed top-[92px] left-0 bottom-0 z-50 w-[308px] max-w-[calc(100vw-24px)] brand-soft-panel border-r border-[#d8e4f0]',
          'shadow-[2px_0_12px_rgba(6,34,61,0.16)] overflow-hidden drawer-transition transform',
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
                    'flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] transition-all border-l-[3px] group',
                    active ? 'bg-[#fff8e6] text-navy-500 border-l-gold-brand font-semibold shadow-sm'
                           : 'text-gray-600 border-l-transparent hover:bg-[#f6faff] hover:text-navy-500 hover:border-l-[#f4b000]'
                  )}>
                    <Icon size={14} className={clsx('flex-shrink-0 transition-colors', active?'text-gold-dark':'text-gray-400 group-hover:text-navy-500')}/>
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
          <div className="mx-4 mt-5 rounded-xl overflow-hidden border border-[#d4e2ef] brand-watermark">
            <div className="h-1 brand-accent-line" />
            <div className="p-3 bg-white">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-navy-500">Expreso Machupicchu</p>
              <p className="text-[10px] text-gray-500 mt-1">Plataforma operativa de encomiendas, cargas, courier y reparto multisede.</p>
              <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                {isDemoMode ? 'MODO DEMO · Sin backend' : `Sesión ${user?.username || ''} · ${new Date().toLocaleDateString('es-PE')}`}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
