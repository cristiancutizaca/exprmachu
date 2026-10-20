'use client'
import { useState, useRef, useEffect } from 'react'
import { Settings, Menu, LogOut, Bell, User, ChevronDown, Check, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore, useUIStore, useNotifStore } from '@/store'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import type { Notificacion } from '@/lib/data'
import { authApi } from '@/lib/api'

const NOTIF_COLORS: Record<string, string> = {
  info:    'bg-blue-100 text-blue-600',
  success: 'bg-green-100 text-green-600',
  warning: 'bg-amber-100 text-amber-600',
  error:   'bg-red-100 text-red-600',
}
const NOTIF_DOT: Record<string, string> = {
  info:'bg-blue-500', success:'bg-green-500', warning:'bg-amber-500', error:'bg-red-500'
}

function NotifPanel({ onClose }: { onClose: () => void }) {
  const { notifs, unreadCount, marcarLeida, marcarTodas } = useNotifStore()
  const router = useRouter()
  return (
    <div className="absolute right-0 top-10 w-[360px] bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-gray-500"/>
          <span className="text-[13px] font-semibold text-gray-700">Notificaciones</span>
          {unreadCount > 0 && (
            <span className="bg-sky-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={marcarTodas}
              className="text-[11px] text-sky-brand hover:underline flex items-center gap-1">
              <Check size={11}/> Marcar todas
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
        </div>
      </div>
      <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
        {notifs.length === 0 && (
          <p className="py-8 text-center text-gray-400 text-[12px]">Sin notificaciones</p>
        )}
        {notifs.map(n => (
          <button key={n.id}
            onClick={() => { marcarLeida(n.id); if (n.link) { router.push(n.link); onClose() } }}
            className={clsx(
              'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3',
              !n.leida && 'bg-blue-50/40'
            )}>
            <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', NOTIF_COLORS[n.tipo])}>
              <Bell size={13}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-semibold text-gray-800 leading-tight">{n.titulo}</p>
                {!n.leida && <span className={clsx('w-2 h-2 rounded-full flex-shrink-0 mt-1', NOTIF_DOT[n.tipo])}/>}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.mensaje}</p>
              <p className="text-[10px] text-gray-400 mt-1">{n.fecha}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function UserMenu({ onClose }: { onClose: () => void }) {
  const router  = useRouter()
  const { user, logout } = useAuthStore()
  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* logout JWT es stateless; limpieza local siempre prevalece */ }
    logout()
    toast.success('Sesión cerrada')
    router.push('/login')
    onClose()
  }
  return (
    <div className="absolute right-0 top-10 w-[220px] bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <p className="text-[12px] font-semibold text-gray-800">{user?.nombre} {user?.apellido}</p>
        <p className="text-[11px] text-gray-500">{user?.username}</p>
        <span className="inline-block mt-1 text-[10px] bg-navy-100 text-navy-600 px-2 py-0.5 rounded-full font-medium">
          {user?.rol?.replace('_', ' ')}
        </span>
      </div>
      {[
        { icon: <User size={13}/>,     label: 'Mi perfil',      onClick: ()=>{ toast('Perfil...'); onClose() } },
        { icon: <Settings size={13}/>, label: 'Configuración',  onClick: ()=>{ toast('Config...'); onClose() } },
      ].map(item => (
        <button key={item.label} onClick={item.onClick}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-gray-600
                     hover:bg-gray-50 transition-colors">
          <span className="text-gray-400">{item.icon}</span>{item.label}
        </button>
      ))}
      <div className="border-t">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-red-600
                     hover:bg-red-50 transition-colors">
          <LogOut size={13} className="text-red-400"/>Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default function Topbar() {
  const toggleDrawer  = useUIStore(s => s.toggleDrawer)
  const { user }      = useAuthStore()
  const { unreadCount } = useNotifStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen,  setUserOpen]  = useState(false)

  const initials = user
    ? `${user.nombre[0]}${user.apellido[0]}`.toUpperCase()
    : 'GR'

  // Cerrar al click fuera
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setNotifOpen(false); setUserOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[54px] bg-navy-500 shadow-topbar
                       flex items-center px-4 gap-3" ref={ref}>
      {/* Hamburguesa */}
      <button onClick={toggleDrawer}
        className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-all"
        title="Menú (Ctrl+B)">
        <Menu size={20}/>
      </button>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-baseline gap-2 select-none">
        <span className="text-xl font-bold italic text-white tracking-widest">
          GR<span className="text-sky-light">AE</span>L
          <sup className="text-sky-light text-[10px] not-italic">›</sup>
        </span>
        <span className="text-white/60 text-xs tracking-wider hidden sm:block">ADM DE SEDE</span>
      </Link>

      {/* Spacer */}
      <div className="flex-1"/>

      {/* Sede pill */}
      <div className="hidden md:flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"/>
        <span className="text-white/80 text-[11px] font-medium">{user?.sede || 'CUSCO'}</span>
      </div>

      {/* Notificaciones */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false) }}
          className="relative p-1.5 text-white/70 hover:text-white transition-colors rounded hover:bg-white/10"
          title="Notificaciones">
          <Bell size={18}/>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px]
                             font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {notifOpen && <NotifPanel onClose={() => setNotifOpen(false)}/>}
      </div>

      {/* Avatar + menu */}
      <div className="relative">
        <button
          onClick={() => { setUserOpen(!userOpen); setNotifOpen(false) }}
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-white/10 transition-colors">
          <div className="w-7 h-7 bg-sky-brand rounded-full flex items-center justify-center
                          text-white text-[11px] font-bold flex-shrink-0">
            {initials}
          </div>
          <span className="text-white text-[11px] font-medium hidden md:block max-w-[120px] truncate">
            {user?.nombre}
          </span>
          <ChevronDown size={12} className={clsx('text-white/60 transition-transform', userOpen && 'rotate-180')}/>
        </button>
        {userOpen && <UserMenu onClose={() => setUserOpen(false)}/>}
      </div>
    </header>
  )
}
