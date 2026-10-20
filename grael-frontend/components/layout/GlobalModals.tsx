'use client'
import { useUIStore } from '@/store'
export { useConfirm } from '@/store'
import { AlertTriangle, Info, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ─── Modal de confirmación ────────────────────────────────────────────────────
export function ConfirmModal() {
  const { confirm, resolveConfirm } = useUIStore()
  if (!confirm) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4"
      onClick={() => resolveConfirm(false)}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}>
        <div className={`flex items-center gap-3 px-5 py-4 rounded-t-xl
          ${confirm.danger ? 'bg-red-50 border-b border-red-100' : 'bg-gray-50 border-b border-gray-100'}`}>
          {confirm.danger
            ? <AlertTriangle size={18} className="text-red-500 flex-shrink-0"/>
            : <Info size={18} className="text-sky-brand flex-shrink-0"/>
          }
          <h3 className="font-semibold text-[14px] text-gray-800">{confirm.titulo}</h3>
          <button onClick={() => resolveConfirm(false)} className="ml-auto text-gray-400 hover:text-gray-600">
            <X size={16}/>
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] text-gray-600 leading-relaxed">{confirm.mensaje}</p>
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => resolveConfirm(false)}>
            {confirm.labelCancel || 'Cancelar'}
          </Button>
          <Button
            variant={confirm.danger ? 'danger' : 'primary'}
            onClick={() => resolveConfirm(true)}>
            {confirm.labelOk || 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Atajos de teclado globales ───────────────────────────────────────────────
export function KeyboardShortcuts() {
  const router     = useRouter()
  const { toggleDrawer } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'b')  { e.preventDefault(); toggleDrawer() }
      if (ctrl && e.key === 'n')  { e.preventDefault(); router.push('/recepcion') }
      if (ctrl && e.key === 'f')  { e.preventDefault(); router.push('/busqueda') }
      if (ctrl && e.key === '1')  { e.preventDefault(); router.push('/dashboard') }
      if (ctrl && e.key === '2')  { e.preventDefault(); router.push('/recepcion') }
      if (ctrl && e.key === '3')  { e.preventDefault(); router.push('/busqueda') }
      if (ctrl && e.key === '4')  { e.preventDefault(); router.push('/caja-diaria') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router, toggleDrawer])

  return null
}
