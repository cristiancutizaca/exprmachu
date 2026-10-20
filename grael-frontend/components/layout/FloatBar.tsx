'use client'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface FloatAction {
  label:    string
  icon:     ReactNode
  onClick:  () => void
  primary?: boolean
  danger?:  boolean
}

export default function FloatBar({ actions }: { actions: FloatAction[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 glass-dark rounded-xl px-4 py-2.5
                    flex items-center gap-1.5 shadow-float">
      {actions.map((action, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i > 0 && <div className="w-px h-5 bg-white/20" />}
          <button
            onClick={action.onClick}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all',
              action.primary
                ? 'bg-sky-brand text-white hover:bg-sky-dark'
                : action.danger
                ? 'bg-red-600/80 text-white hover:bg-red-600'
                : 'bg-white/10 text-white hover:bg-white/20'
            )}
          >
            {action.icon}
            {action.label}
          </button>
        </div>
      ))}
    </div>
  )
}
