'use client'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { clsx } from 'clsx'

interface SortableHeaderProps {
  label:    string
  field:    string
  current:  string
  dir:      'asc' | 'desc'
  onSort:   (field: string) => void
  className?: string
}

export function SortableHeader({ label, field, current, dir, onSort, className }: SortableHeaderProps) {
  const active = current === field
  return (
    <th
      className={clsx(
        'px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider',
        'cursor-pointer select-none whitespace-nowrap hover:text-navy-500 transition-colors group',
        active && 'text-navy-500',
        className
      )}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="flex-shrink-0">
          {active ? (
            dir === 'asc'
              ? <ChevronUp   size={11} className="text-sky-brand"/>
              : <ChevronDown size={11} className="text-sky-brand"/>
          ) : (
            <ChevronsUpDown size={11} className="text-gray-300 group-hover:text-gray-400"/>
          )}
        </span>
      </div>
    </th>
  )
}

// Hook para manejar estado de sort
export function useSortState(defaultField = '', defaultDir: 'asc'|'desc' = 'desc') {
  const [sortField, setSortField] = React.useState(defaultField)
  const [sortDir,   setSortDir]   = React.useState<'asc'|'desc'>(defaultDir)

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  return { sortField, sortDir, handleSort }
}

import * as React from 'react'
