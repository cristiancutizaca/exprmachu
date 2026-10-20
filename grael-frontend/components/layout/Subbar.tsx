'use client'
import { usePathname } from 'next/navigation'
import { Home, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const LABELS: Record<string, string> = {
  dashboard:'Inicio', recepcion:'Recepción de Carga', busqueda:'Búsqueda de Ticket',
  transbordo:'Transbordo', manifiesto:'Manifiesto', desembarque:'Desembarque',
  inventario:'Inventario', comprobantes:'Comprobantes', bolsa:'Bolsa',
  detraccion:'Detracción', 'caja-diaria':'Caja Diaria', 'busqueda-qr':'Búsqueda de QR',
  'pago-sin-comprobante':'Pago sin Comprobante', reportes:'Reportes', configuracion:'Configuración',
}

export default function Subbar() {
  const pathname = usePathname()
  const segs = pathname.split('/').filter(Boolean)
  const key  = segs[0] || 'dashboard'
  const lbl  = LABELS[key] || key

  return (
    <div className="fixed top-[54px] left-0 right-0 z-40 h-[38px] bg-subbar flex items-center px-4 shadow-sm">
      <nav className="flex items-center gap-1.5 text-[11px] text-white/80">
        <Link href="/dashboard" className="hover:text-white transition-colors"><Home size={13}/></Link>
        {key !== 'dashboard' && <><ChevronRight size={11} className="text-white/40"/><span className="text-white font-medium">{lbl}</span></>}
        {segs.length > 1 && <><ChevronRight size={11} className="text-white/40"/><span className="text-white/60">#{segs[1]}</span></>}
      </nav>
      <div className="ml-auto hidden lg:flex items-center gap-2 text-white/30 text-[10px]">
        <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded">Ctrl+N</span><span>Nueva recepción</span>
        <span className="ml-2 font-mono bg-white/10 px-1.5 py-0.5 rounded">Ctrl+F</span><span>Buscar</span>
        <span className="ml-2 font-mono bg-white/10 px-1.5 py-0.5 rounded">Ctrl+B</span><span>Menú</span>
      </div>
    </div>
  )
}
