import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { NOTIFICACIONES_INIT } from '@/lib/data'
import type { User } from '@/types'
import type { Notificacion } from '@/lib/data'

// ─── AUTH ─────────────────────────────────────────────────────────────────────
interface AuthStore {
  user: User | null; token: string | null; isAuthenticated: boolean
  hydrated: boolean
  login:  (user: User, token: string) => void
  logout: () => void
}
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null, token: null, isAuthenticated: false, hydrated: false,
      login:  (user, token) => set({ user, token, isAuthenticated: true, hydrated: true }),
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, hydrated: true })
        if (typeof window !== 'undefined') sessionStorage.removeItem('grael-auth')
      },
    }),
    {
      name: 'grael-auth',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => () => useAuthStore.setState({ hydrated: true }),
    }
  )
)

// ─── UI ──────────────────────────────────────────────────────────────────────
interface UIStore {
  drawerOpen:       boolean
  toggleDrawer:     () => void
  setDrawerOpen:    (v: boolean) => void
  // Confirm modal
  confirm:          ConfirmState | null
  showConfirm:      (opts: ConfirmOptions) => void
  resolveConfirm:   (result: boolean) => void
}
interface ConfirmOptions {
  titulo:    string
  mensaje:   string
  labelOk?:  string
  labelCancel?: string
  danger?:   boolean
}
interface ConfirmState extends ConfirmOptions {
  resolve: (v: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  // El drawer es un overlay transitorio: nunca se persiste y siempre empieza cerrado.
  drawerOpen:    false,
  toggleDrawer:  () => set((s) => ({ drawerOpen: !s.drawerOpen })),
  setDrawerOpen: (v) => set({ drawerOpen: v }),
  confirm:       null,
  showConfirm: (opts) => new Promise<boolean>((resolve) => {
    set({ confirm: { ...opts, resolve } })
  }),
  resolveConfirm: (result) => set((s) => {
    s.confirm?.resolve(result)
    return { confirm: null }
  }),
}))

export function useConfirm() {
  const showConfirm = useUIStore(s => s.showConfirm)
  return (opts: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
      useUIStore.setState({ confirm: { ...opts, resolve } })
    })
}

// ─── NOTIFICACIONES ───────────────────────────────────────────────────────────
interface NotifStore {
  notifs:       Notificacion[]
  unreadCount:  number
  marcarLeida:  (id: string) => void
  marcarTodas: () => void
  agregar:      (n: Omit<Notificacion, 'id' | 'leida'>) => void
}
export const useNotifStore = create<NotifStore>((set) => ({
  notifs:      NOTIFICACIONES_INIT,
  unreadCount: NOTIFICACIONES_INIT.filter(n => !n.leida).length,
  marcarLeida: (id) => set((s) => {
    const notifs = s.notifs.map(n => n.id === id ? { ...n, leida: true } : n)
    return { notifs, unreadCount: notifs.filter(n => !n.leida).length }
  }),
  marcarTodas: () => set((s) => ({
    notifs: s.notifs.map(n => ({ ...n, leida: true })), unreadCount: 0
  })),
  agregar: (n) => set((s) => {
    const nueva = { ...n, id: `n${Date.now()}`, leida: false }
    const notifs = [nueva, ...s.notifs]
    return { notifs, unreadCount: notifs.filter(x => !x.leida).length }
  }),
}))

// ─── RECEPCIÓN ────────────────────────────────────────────────────────────────
import type { Mercaderia, GRR } from '@/types'
interface RecepcionStore {
  guias:            GRR[]
  mercaderias:      Mercaderia[]
  addGuia:          (codigo: string) => void
  removeGuia:       (idx: number) => void
  addMercaderia:    (m: Mercaderia) => void
  removeMercaderia: (idx: number) => void
  updateMercaderia: (idx: number, m: Partial<Mercaderia>) => void
  resetRecepcion:   () => void
}
export const useRecepcionStore = create<RecepcionStore>((set) => ({
  guias:            [],
  mercaderias:      [],
  addGuia:          (codigo) => set((s) => ({ guias: [...s.guias, { codigo }] })),
  removeGuia:       (idx)    => set((s) => ({ guias: s.guias.filter((_, i) => i !== idx) })),
  addMercaderia:    (m)      => set((s) => ({ mercaderias: [...s.mercaderias, m] })),
  removeMercaderia: (idx)    => set((s) => ({ mercaderias: s.mercaderias.filter((_, i) => i !== idx) })),
  updateMercaderia: (idx, m) => set((s) => ({
    mercaderias: s.mercaderias.map((x, i) => i === idx ? { ...x, ...m } : x)
  })),
  resetRecepcion:   () => set({ guias: [], mercaderias: [] }),
}))
