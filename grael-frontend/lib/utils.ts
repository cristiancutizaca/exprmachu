import { clsx, type ClassValue } from 'clsx'
import { twMerge }              from 'tailwind-merge'

// ─── className helper ─────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Formateo moneda ──────────────────────────────────────────────────────────
export function formatMoney(amount: number): string {
  return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatMoneyShort(amount: number): string {
  if (amount >= 1_000_000) return `S/ ${(amount/1_000_000).toFixed(1)}M`
  if (amount >= 1_000)     return `S/ ${(amount/1_000).toFixed(1)}K`
  return formatMoney(amount)
}

// ─── Fechas ───────────────────────────────────────────────────────────────────
export function formatDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })
}

export function formatDateTime(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleString('es-PE', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  })
}

export function formatTimeAgo(d: string | Date): string {
  const date  = typeof d === 'string' ? new Date(d) : d
  const diff  = Date.now() - date.getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)    return 'ahora'
  if (mins < 60)   return `hace ${mins} min`
  if (hours < 24)  return `hace ${hours} hr`
  if (days < 7)    return `hace ${days} días`
  return formatDate(date)
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows    = data.map(row =>
    headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  const csv     = [headers.join(','), ...rows].join('\n')
  const bom     = '\uFEFF'  // BOM para Excel en español
  const blob    = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url     = URL.createObjectURL(blob)
  const link    = document.createElement('a')
  link.href     = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Print ────────────────────────────────────────────────────────────────────
export function printElement(id: string, title = 'GRAEL') {
  const el = document.getElementById(id)
  if (!el) return
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:Arial,sans-serif; font-size:12px; }
        body { padding:20px; }
        table { width:100%; border-collapse:collapse; }
        th, td { border:1px solid #ccc; padding:6px 10px; text-align:left; }
        th { background:#f0f0f0; font-weight:bold; }
        .no-print { display:none !important; }
        @media print { .no-print { display:none !important; } }
      </style>
    </head>
    <body>${el.innerHTML}</body>
    </html>
  `)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 400)
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

// ─── Sort helper ──────────────────────────────────────────────────────────────
export function sortBy<T>(arr: T[], key: keyof T, dir: 'asc'|'desc' = 'asc'): T[] {
  return [...arr].sort((a, b) => {
    const va = a[key]; const vb = b[key]
    if (va === vb) return 0
    const cmp = va < vb ? -1 : 1
    return dir === 'asc' ? cmp : -cmp
  })
}

// ─── Meses ────────────────────────────────────────────────────────────────────
export const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

// ─── Colores por método de pago ───────────────────────────────────────────────
export const METODO_COLORS: Record<string, string> = {
  EFECTIVO:      '#22c55e',
  TRANSFERENCIA: '#3b82f6',
  YAPE:          '#a855f7',
  PLIN:          '#ec4899',
  TARJETA:       '#f97316',
}

// ─── Estado ticket color ──────────────────────────────────────────────────────
export const ESTADO_COLORS: Record<string, { bg:string; text:string; label:string }> = {
  PENDIENTE:              { bg:'bg-amber-100',  text:'text-amber-700',  label:'Pendiente' },
  EN_TRANSITO:            { bg:'bg-blue-100',   text:'text-blue-700',   label:'En Tránsito' },
  DESEMBARQUE_EN_DESTINO: { bg:'bg-indigo-100', text:'text-indigo-700', label:'Desembarque' },
  ENTREGADO:              { bg:'bg-green-100',  text:'text-green-700',  label:'Entregado' },
  ANULADO:                { bg:'bg-gray-100',   text:'text-gray-500',   label:'Anulado' },
}
