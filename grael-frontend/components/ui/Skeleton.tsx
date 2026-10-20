'use client'
import { clsx } from 'clsx'

// ─── Skeleton base ────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx(
      'animate-pulse bg-gray-200 rounded',
      className
    )} />
  )
}

// ─── Skeleton de card KPI ─────────────────────────────────────────────────────
export function KpiSkeleton() {
  return (
    <div className="bg-white rounded-md shadow-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="w-10 h-10 rounded-lg"/>
        <Skeleton className="w-12 h-4 rounded-full"/>
      </div>
      <Skeleton className="h-8 w-24"/>
      <Skeleton className="h-3 w-32"/>
    </div>
  )
}

// ─── Skeleton de tabla ────────────────────────────────────────────────────────
export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-md shadow-card overflow-hidden">
      {/* Fake header */}
      <div className="flex gap-4 px-4 py-3 bg-gray-50 border-b-2 border-gray-200">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 max-w-[120px]"/>
        ))}
      </div>
      {/* Fake rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-4 border-b border-gray-100">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={clsx('h-4 flex-1', j === 0 ? 'max-w-[30px]' : 'max-w-[140px]')}/>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton de fila de ticket ────────────────────────────────────────────────
export function TicketRowSkeleton() {
  return (
    <div className="flex items-start gap-4 px-4 py-3 border-b border-gray-100">
      <Skeleton className="w-4 h-4 rounded mt-0.5 flex-shrink-0"/>
      <div className="space-y-1.5 flex-shrink-0 w-36">
        <Skeleton className="h-3 w-32"/>
        <Skeleton className="h-2.5 w-24"/>
      </div>
      <div className="space-y-1.5 flex-shrink-0 w-40">
        <Skeleton className="h-4 w-24 rounded-full"/>
        <Skeleton className="h-3 w-36"/>
      </div>
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-28"/>
        <Skeleton className="h-2.5 w-20"/>
        <Skeleton className="h-2.5 w-24"/>
      </div>
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-32"/>
        <Skeleton className="h-2.5 w-20"/>
      </div>
      <div className="flex-shrink-0 w-24 space-y-1">
        <Skeleton className="h-5 w-20"/>
        <Skeleton className="h-4 w-16 rounded-full"/>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <Skeleton className="w-7 h-7 rounded"/>
        <Skeleton className="w-7 h-7 rounded"/>
      </div>
    </div>
  )
}

// ─── Skeleton página completa ─────────────────────────────────────────────────
export function PageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-md shadow-card p-4 flex items-center justify-between">
        <Skeleton className="h-5 w-48"/>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-28 rounded"/>
          <Skeleton className="h-7 w-24 rounded"/>
        </div>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <KpiSkeleton key={i}/>)}
      </div>
      {/* Tabla */}
      <TableSkeleton/>
    </div>
  )
}
