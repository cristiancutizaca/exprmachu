import type { ReactNode } from 'react'
import { ArrowUpRight, Mountain, PackageCheck, Route, ShieldCheck, Truck } from 'lucide-react'
import { clsx } from 'clsx'

/** Identidad vectorial provisional de producto; no pretende ser el logotipo legal de la empresa. */
export function BrandMark({ size = 'md', light = false, className }: { size?: 'sm'|'md'|'lg'; light?: boolean; className?: string }) {
  const dims = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' }
  return <span aria-hidden="true" className={clsx('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border', dims[size], light ? 'border-white/20 bg-white/10' : 'border-[#d8e5f2] bg-[#0b3153]', className)}>
    <svg viewBox="0 0 64 64" fill="none" className="w-[82%] h-[82%]" aria-hidden="true">
      <path d="M3 40 17 20l9 12L37 11l24 29" stroke="#f7c64a" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 48h48" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" opacity=".9" />
      <path d="M15 54h21l6-6h8" stroke="#f7c64a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
}

export function BrandSignature({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return <span className="flex min-w-0 items-center gap-2.5"><BrandMark light={inverse} size={compact ? 'sm' : 'md'} /><span className="min-w-0 flex flex-col">
    <strong className={clsx('leading-none uppercase font-black tracking-[0.075em]', compact ? 'text-[12px] sm:text-sm' : 'text-[16px]', inverse ? 'text-white' : 'text-[#0d3055]')}>Expreso Machupicchu</strong>
    <span className={clsx('mt-1 text-[9px] font-semibold tracking-[0.11em] uppercase truncate', inverse ? 'text-white/75' : 'text-[#5c7188]')}>Encomiendas · Cargas · Courier</span>
  </span></span>
}

type HeroIcon = typeof Truck
export function BrandHero({ kicker = 'Plataforma operativa', title, description, icon: Icon = Mountain, actions, meta, compact = false }: {
  kicker?: string; title: string; description: string; icon?: HeroIcon; actions?: ReactNode; meta?: ReactNode; compact?: boolean
}) {
  return <section className={clsx('relative isolate overflow-hidden rounded-[22px] border border-[#174872]/30 bg-[#0b3153] text-white shadow-[0_14px_38px_rgba(11,49,83,.12)]', compact ? 'px-5 py-5 md:px-7' : 'px-6 py-7 md:px-9 md:py-8')}>
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{background:'radial-gradient(circle at 78% 20%,rgba(240,184,55,.20),transparent 34%),linear-gradient(125deg,#0a2c4b 10%,#104e77 90%)'}} />
    <svg aria-hidden="true" viewBox="0 0 560 240" preserveAspectRatio="xMidYMax slice" className="absolute -bottom-3 right-0 h-full w-auto min-w-[42%] opacity-[.19] pointer-events-none">
      <path d="M0 218 100 116l57 55 101-130 77 91 68-62 157 148Z" fill="#7bb2cd"/>
      <path d="M0 238 110 166l66 32 85-93 99 91 87-49 113 91Z" fill="#e7c36b"/>
      <path d="m258 41 26 31-15-5-13 11-11-13-16 12z" fill="white" opacity=".6"/>
      <path d="M65 222c55-24 143-34 233-17s150 9 239-6" stroke="#fff" strokeWidth="6" strokeDasharray="12 17" opacity=".55" fill="none"/>
    </svg>
    <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-[690px] min-w-0">
        <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-[#f8d271]"><Icon size={15}/>{kicker}</span>
        <h1 className={clsx('mt-2 font-black tracking-tight leading-tight', compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-[30px]')}>{title}</h1>
        <p className="mt-2 text-[12px] sm:text-[13px] leading-relaxed text-white/80 max-w-[600px]">{description}</p>
        {meta && <div className="mt-3 text-xs font-medium text-white/85">{meta}</div>}
      </div>
      {actions && <div className="relative z-10 flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
    <div className="absolute left-0 bottom-0 h-1 w-full bg-gradient-to-r from-[#f2b531] via-[#ffe49a] to-transparent"/>
  </section>
}

export const BrandOperationIcons = { Truck, PackageCheck, Route, ShieldCheck, ArrowUpRight }
