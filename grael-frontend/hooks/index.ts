import { useState, useEffect, useCallback, useRef } from 'react'

// ─── useDebounce ──────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── useLocalStorage ──────────────────────────────────────────────────────────
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initial
    } catch { return initial }
  })
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as Function)(prev) : v
      try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])
  return [value, set] as const
}

// ─── usePagination ────────────────────────────────────────────────────────────
export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const start   = (page - 1) * pageSize
  const current = items.slice(start, start + pageSize)

  // Resetear cuando cambia la lista
  useEffect(() => { setPage(1) }, [items.length])

  const prev = useCallback(() => setPage(p => Math.max(1, p - 1)), [])
  const next = useCallback(() => setPage(p => Math.min(totalPages, p + 1)), [totalPages])
  const go   = useCallback((n: number) => setPage(Math.max(1, Math.min(totalPages, n))), [totalPages])

  return { page, totalPages, current, prev, next, go, total: items.length, start, end: start + current.length }
}

// ─── useSort ──────────────────────────────────────────────────────────────────
export function useSort<T>(items: T[], defaultField?: keyof T, defaultDir: 'asc'|'desc' = 'desc') {
  const [field, setField] = useState<keyof T | undefined>(defaultField)
  const [dir,   setDir]   = useState<'asc'|'desc'>(defaultDir)

  const handleSort = useCallback((f: keyof T) => {
    setField(prev => {
      if (prev === f) { setDir(d => d === 'asc' ? 'desc' : 'asc'); return f }
      setDir('asc'); return f
    })
  }, [])

  const sorted = field
    ? [...items].sort((a, b) => {
        const va = a[field]; const vb = b[field]
        if (va === vb) return 0
        if (va == null) return 1; if (vb == null) return -1
        const cmp = String(va) < String(vb) ? -1 : 1
        return dir === 'asc' ? cmp : -cmp
      })
    : items

  return { sorted, field, dir, handleSort }
}

// ─── useClickOutside ─────────────────────────────────────────────────────────
export function useClickOutside<T extends HTMLElement>(cb: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [cb])
  return ref
}

// ─── useCountUp ──────────────────────────────────────────────────────────────
export function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

// ─── useWindowSize ────────────────────────────────────────────────────────────
export function useWindowSize() {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return size
}

// ─── useToggle ────────────────────────────────────────────────────────────────
export function useToggle(initial = false) {
  const [on, set] = useState(initial)
  const toggle  = useCallback(() => set(v => !v), [])
  const turnOn  = useCallback(() => set(true), [])
  const turnOff = useCallback(() => set(false), [])
  return [on, { toggle, turnOn, turnOff }] as const
}

// ─── useAsyncAction ──────────────────────────────────────────────────────────
export function useAsyncAction() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const run = useCallback(async (fn: () => Promise<any>) => {
    setLoading(true); setError(null)
    try { return await fn() }
    catch (e: any) { setError(e?.message || 'Error'); throw e }
    finally { setLoading(false) }
  }, [])

  return { loading, error, run }
}
