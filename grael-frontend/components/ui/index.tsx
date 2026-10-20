// ─────────────────────────────────────────────────────────────────────────────
// GRAEL UI Component Library
// ─────────────────────────────────────────────────────────────────────────────
import { clsx } from 'clsx'
import { Loader2, ChevronLeft, ChevronRight, X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode, HTMLAttributes } from 'react'

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary'|'secondary'|'success'|'danger'|'outline'|'ghost'|'dark'
type BtnSize    = 'xs'|'sm'|'md'|'lg'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; size?: BtnSize; loading?: boolean; icon?: ReactNode; children: ReactNode
}
const BVARS: Record<BtnVariant,string> = {
  primary:   'bg-sky-brand text-white hover:bg-sky-dark active:scale-[0.98]',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700 active:scale-[0.98]',
  success:   'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]',
  outline:   'bg-white text-sky-brand border border-sky-brand hover:bg-blue-50 active:scale-[0.98]',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100',
  dark:      'bg-navy-500 text-white hover:bg-navy-600 active:scale-[0.98]',
}
const BSIZES: Record<BtnSize,string> = {
  xs: 'px-2.5 py-1 text-[11px] gap-1',
  sm: 'px-3 py-1.5 text-[12px] gap-1.5',
  md: 'px-4 py-2 text-[13px] gap-2',
  lg: 'px-5 py-2.5 text-[14px] gap-2',
}
export function Button({ variant='primary', size='sm', loading, icon, children, className, disabled, ...props }: ButtonProps) {
  return (
    <button disabled={disabled||loading}
      className={clsx('inline-flex items-center justify-center rounded font-medium transition-all',
        'disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap select-none',
        BVARS[variant], BSIZES[size], className)}
      {...props}>
      {loading ? <Loader2 size={13} className="animate-spin flex-shrink-0"/> : icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { error?: string; suffix?: ReactNode }
export function Input({ className, error, suffix, ...props }: InputProps) {
  return (
    <div className="relative w-full">
      <input className={clsx(
        'w-full border rounded px-2.5 py-1.5 text-[12.5px] text-gray-800',
        'focus:outline-none focus:ring-2 transition-colors placeholder:text-gray-300',
        error
          ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20 bg-red-50'
          : 'border-gray-300 focus:border-sky-brand focus:ring-sky-brand/20 bg-white',
        suffix && 'pr-8', className)} {...props}/>
      {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{suffix}</span>}
      {error && <p className="mt-0.5 text-[11px] text-red-500 flex items-center gap-1"><AlertCircle size={10}/>{error}</p>}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { error?: string }
export function Select({ className, error, children, ...props }: SelectProps) {
  return (
    <div className="w-full">
      <select className={clsx(
        'w-full border rounded px-2.5 py-1.5 text-[12.5px] text-gray-800 bg-white',
        'focus:outline-none focus:ring-2 transition-colors cursor-pointer',
        error
          ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
          : 'border-gray-300 focus:border-sky-brand focus:ring-sky-brand/20',
        className)} {...props}>
        {children}
      </select>
      {error && <p className="mt-0.5 text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  const { error, ...rest } = props as any
  return (
    <textarea className={clsx(
      'w-full border rounded px-2.5 py-1.5 text-[12.5px] text-gray-800 resize-none',
      'focus:outline-none focus:ring-2 transition-colors placeholder:text-gray-300',
      error ? 'border-red-400 focus:ring-red-400/20' : 'border-gray-300 focus:border-sky-brand focus:ring-sky-brand/20',
      className)} {...rest}/>
  )
}

// ─── FormField ────────────────────────────────────────────────────────────────
interface FieldProps { label: string; children: ReactNode; className?: string; required?: boolean; hint?: string; error?: string }
export function FormField({ label, children, className, required, hint, error }: FieldProps) {
  return (
    <div className={clsx('flex flex-col gap-0.5', className)}>
      <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps extends HTMLAttributes<HTMLDivElement> { padding?: boolean | string; hover?: boolean }
export function Card({ children, className, padding = true, hover, ...props }: CardProps) {
  return (
    <div className={clsx(
      'bg-white rounded-md shadow-card border border-gray-100',
      typeof padding === 'string' ? padding : padding ? 'p-4' : '',
      hover && 'hover:shadow-md transition-shadow cursor-pointer',
      className)} {...props}>
      {children}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'default'|'pagado'|'nopagado'|'agencia'|'reparto'|'pendiente'|'success'|'danger'|'warning'|'info'
const BADVARS: Record<BadgeVariant,string> = {
  default:   'bg-gray-100 text-gray-600',
  pagado:    'bg-green-100 text-green-700',
  nopagado:  'bg-red-100 text-red-600',
  agencia:   'bg-blue-100 text-blue-700',
  reparto:   'bg-indigo-100 text-indigo-700',
  pendiente: 'bg-amber-100 text-amber-700',
  success:   'bg-green-100 text-green-700',
  danger:    'bg-red-100 text-red-600',
  warning:   'bg-amber-100 text-amber-700',
  info:      'bg-sky-100 text-sky-700',
}
interface BadgeProps { label: string; variant?: BadgeVariant; className?: string; dot?: boolean }
export function Badge({ label, variant='default', className, dot }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', BADVARS[variant], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current"/>}
      {label}
    </span>
  )
}

// ─── StatusBadge (para estados de ticket) ────────────────────────────────────
const SBMAP: Record<string,{bg:string;text:string;label:string}> = {
  PENDIENTE:              { bg:'bg-amber-100',  text:'text-amber-700',  label:'Pendiente'   },
  EN_TRANSITO:            { bg:'bg-blue-100',   text:'text-blue-700',   label:'En Tránsito' },
  DESEMBARQUE_EN_DESTINO: { bg:'bg-indigo-100', text:'text-indigo-700', label:'Desembarque' },
  ENTREGADO:              { bg:'bg-green-100',  text:'text-green-700',  label:'Entregado'   },
  ANULADO:                { bg:'bg-gray-100',   text:'text-gray-500',   label:'Anulado'     },
  // Manifiesto / Transbordo
  ABIERTO:                { bg:'bg-amber-100',  text:'text-amber-700',  label:'Abierto'     },
  EN_RUTA:                { bg:'bg-blue-100',   text:'text-blue-700',   label:'En Ruta'     },
  LLEGADO:                { bg:'bg-green-100',  text:'text-green-700',  label:'Llegado'     },
  CERRADO:                { bg:'bg-gray-100',   text:'text-gray-500',   label:'Cerrado'     },
}
export function StatusBadge({ estado, className }: { estado: string; className?: string }) {
  const s = SBMAP[estado] || { bg:'bg-gray-100', text:'text-gray-600', label: estado }
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', s.bg, s.text, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"/>
      {s.label}
    </span>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
interface ToggleProps { checked: boolean; onChange: (v: boolean) => void; label?: string; size?: 'sm'|'md' }
export function Toggle({ checked, onChange, label, size='md' }: ToggleProps) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative rounded-full transition-colors flex-shrink-0',
          size === 'sm' ? 'w-8 h-4' : 'w-10 h-5',
          checked ? 'bg-sky-brand' : 'bg-gray-300'
        )}>
        <div className={clsx(
          'absolute top-0.5 bg-white rounded-full shadow transition-transform',
          size === 'sm' ? 'w-3 h-3 left-0.5' : 'w-4 h-4 left-0.5',
          checked && (size === 'sm' ? 'translate-x-4' : 'translate-x-5')
        )}/>
      </div>
      {label && <span className="text-[12px] text-gray-600 font-medium">{label}</span>}
    </label>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
interface TabItem { id: string; label: string; icon?: ReactNode; badge?: number }
interface TabsProps { items: TabItem[]; active: string; onChange: (id: string) => void; variant?: 'pills'|'line' }
export function Tabs({ items, active, onChange, variant='pills' }: TabsProps) {
  if (variant === 'line') {
    return (
      <div className="flex gap-0 border-b border-gray-200">
        {items.map(t => (
          <button key={t.id} onClick={() => onChange(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium transition-all border-b-2 -mb-px',
              active === t.id
                ? 'border-sky-brand text-sky-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}>
            {t.icon}{t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
      {items.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all',
            active === t.id ? 'bg-white text-navy-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}>
          {t.icon}{t.label}
          {t.badge != null && t.badge > 0 && (
            <span className="bg-sky-brand text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string; footer?: ReactNode }
export function Modal({ open, onClose, title, children, width='max-w-lg', footer }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className={clsx('bg-white rounded-xl shadow-2xl w-full flex flex-col max-h-[90vh]', width)}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h3 className="text-[14px] font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded">
            <X size={16}/>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t flex-shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
interface PaginationProps { page: number; totalPages: number; total: number; start: number; end: number; prev: () => void; next: () => void; go: (n: number) => void }
export function Pagination({ page, totalPages, total, start, end, prev, next, go }: PaginationProps) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const mid = Math.min(Math.max(page, 3), totalPages - 2)
    return mid - 2 + i
  }).filter(p => p >= 1 && p <= totalPages)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-[11px] text-gray-500">
        Mostrando <strong>{start + 1}–{end}</strong> de <strong>{total}</strong>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={prev} disabled={page===1}
          className="w-7 h-7 border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:border-sky-brand hover:text-sky-brand disabled:opacity-40 transition-colors">
          <ChevronLeft size={13}/>
        </button>
        {pages[0] > 1 && <><button className="w-7 h-7 text-[11px] text-gray-500 hover:text-navy-500" onClick={()=>go(1)}>1</button><span className="text-gray-300 text-[11px]">…</span></>}
        {pages.map(p => (
          <button key={p} onClick={()=>go(p)}
            className={clsx('w-7 h-7 rounded text-[11px] font-medium transition-colors',
              p===page ? 'bg-sky-brand text-white' : 'border border-gray-200 text-gray-500 hover:border-sky-brand hover:text-sky-brand')}>
            {p}
          </button>
        ))}
        {pages[pages.length-1] < totalPages && <><span className="text-gray-300 text-[11px]">…</span><button className="w-7 h-7 text-[11px] text-gray-500 hover:text-navy-500" onClick={()=>go(totalPages)}>{totalPages}</button></>}
        <button onClick={next} disabled={page===totalPages}
          className="w-7 h-7 border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:border-sky-brand hover:text-sky-brand disabled:opacity-40 transition-colors">
          <ChevronRight size={13}/>
        </button>
      </div>
    </div>
  )
}

// ─── Alert ────────────────────────────────────────────────────────────────────
type AlertVariant = 'info'|'success'|'warning'|'error'
const ALERTMAP: Record<AlertVariant,{bg:string;border:string;text:string;icon:any}> = {
  info:    { bg:'bg-blue-50',  border:'border-blue-200',  text:'text-blue-800',  icon:Info },
  success: { bg:'bg-green-50', border:'border-green-200', text:'text-green-800', icon:CheckCircle },
  warning: { bg:'bg-amber-50', border:'border-amber-200', text:'text-amber-800', icon:AlertTriangle },
  error:   { bg:'bg-red-50',   border:'border-red-200',   text:'text-red-800',   icon:AlertCircle },
}
interface AlertProps { variant?: AlertVariant; title?: string; children: ReactNode; className?: string; onClose?: () => void }
export function Alert({ variant='info', title, children, className, onClose }: AlertProps) {
  const s = ALERTMAP[variant]
  const Icon = s.icon
  return (
    <div className={clsx('border rounded-lg p-3 flex items-start gap-3', s.bg, s.border, className)}>
      <Icon size={15} className={clsx(s.text, 'flex-shrink-0 mt-0.5')}/>
      <div className="flex-1 min-w-0">
        {title && <p className={clsx('text-[12px] font-semibold', s.text)}>{title}</p>}
        <div className={clsx('text-[11px] mt-0.5', s.text)}>{children}</div>
      </div>
      {onClose && <button onClick={onClose} className={clsx('flex-shrink-0 hover:opacity-70', s.text)}><X size={13}/></button>}
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
interface EmptyProps { icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode }
export function EmptyState({ icon, title, subtitle, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {icon && <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 text-gray-300">{icon}</div>}
      <p className="text-[14px] font-semibold text-gray-500">{title}</p>
      {subtitle && <p className="text-[12px] text-gray-400 mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
interface PageHeaderProps { title: string; subtitle?: string; actions?: ReactNode; back?: () => void }
export function PageHeader({ title, subtitle, actions, back }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-center gap-3">
        {back && (
          <button onClick={back} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft size={18}/>
          </button>
        )}
        <div>
          <h1 className="text-[18px] font-black text-navy-500 leading-tight">{title}</h1>
          {subtitle && <p className="text-[12px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={clsx('text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] mb-3', className)}>
      {children}
    </h2>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string; value: string|number; icon: ReactNode; color: string; sub?: string; onClick?: () => void; trend?: number
}
export function StatCard({ label, value, icon, color, sub, onClick, trend, className, ...props }: StatCardProps) {
  return (
    <Card {...props} hover={!!onClick} onClick={onClick} className={clsx('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('p-2.5 rounded-lg', color)}>{icon}</div>
        {trend !== undefined && (
          <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full', trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-[24px] font-black text-gray-800 leading-none tabular-nums">{value}</p>
      <p className="text-[12px] font-medium text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </Card>
  )
}

// ─── Table helpers ────────────────────────────────────────────────────────────
export function Th({ children, className, onClick, sorted, dir }: {
  children: ReactNode; className?: string; onClick?: () => void
  sorted?: boolean; dir?: 'asc'|'desc'
}) {
  return (
    <th
      onClick={onClick}
      className={clsx(
        'px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap',
        onClick && 'cursor-pointer hover:text-navy-500 select-none transition-colors group',
        sorted && 'text-navy-500',
        className
      )}>
      <span className="inline-flex items-center gap-1">
        {children}
        {onClick && (
          <span className="text-gray-300 group-hover:text-gray-400">
            {sorted ? (dir === 'asc' ? '↑' : '↓') : '↕'}
          </span>
        )}
      </span>
    </th>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx('px-3 py-3 text-[12px] text-gray-700', className)}>{children}</td>
}

// ─── Checkbox row (para selección masiva) ────────────────────────────────────
export function CheckboxRow({ checked, onChange, indeterminate }: {
  checked: boolean; onChange: () => void; indeterminate?: boolean
}) {
  return (
    <td className="px-3 py-3 w-10">
      <input type="checkbox" checked={checked} onChange={onChange}
        ref={el => { if (el) el.indeterminate = !!indeterminate }}
        className="accent-sky-brand w-3.5 h-3.5 cursor-pointer rounded"/>
    </td>
  )
}

// ─── RadioGroup ───────────────────────────────────────────────────────────────
interface RadioOption { value: string; label: string }
interface RadioGroupProps { options: RadioOption[]; value: string; onChange: (v: string) => void; name: string }
export function RadioGroup({ options, value, onChange, name }: RadioGroupProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      {options.map(o => (
        <label key={o.value} className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name={name} value={o.value} checked={value===o.value}
            onChange={() => onChange(o.value)} className="accent-sky-brand w-3.5 h-3.5"/>
          <span className="text-[12px] text-gray-700">{o.label}</span>
        </label>
      ))}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={clsx('border-gray-200 my-3', className)}/>
  return (
    <div className={clsx('flex items-center gap-3 my-3', className)}>
      <div className="flex-1 border-t border-gray-200"/>
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
      <div className="flex-1 border-t border-gray-200"/>
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={clsx('animate-spin text-sky-brand', className)}/>
}

// ─── MoneyStat — display de dinero grande ────────────────────────────────────
export function MoneyStat({ value, label, size='lg', color='text-navy-500' }: {
  value: number; label?: string; size?: 'sm'|'lg'|'xl'; color?: string
}) {
  const formatted = value.toLocaleString('es-PE', { minimumFractionDigits: 2 })
  return (
    <div>
      <span className="text-gray-400 text-[12px]">S/ </span>
      <span className={clsx('font-black tabular-nums', color,
        size==='xl'?'text-[32px]':size==='lg'?'text-[22px]':'text-[16px]')}>
        {formatted}
      </span>
      {label && <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>}
    </div>
  )
}
