'use client'

import { useState } from 'react'
import { Filter, Check } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// Filtre « à la Excel » d'une colonne : on coche les valeurs à afficher.
// Aucune valeur cochée = pas de filtre sur cette colonne.
export function ColumnFilter({ label, options, selected, onChange }: {
  label: string
  options: string[]
  selected: string[]
  onChange: (values: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const active = selected.length > 0
  const q = query.trim().toLowerCase()
  const visible = q ? options.filter(o => o.toLowerCase().includes(q)) : options

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  return (
    <Popover onOpenChange={open => { if (!open) setQuery('') }}>
      <PopoverTrigger
        render={
          <button
            type="button"
            title={`Filtrer « ${label} »`}
            className={cn(
              'relative p-0.5 rounded hover:bg-muted/60 transition-colors',
              active ? 'text-[#c2440f]' : 'text-muted-foreground/60 hover:text-foreground'
            )}
          >
            <Filter className={cn('h-3 w-3', active && 'fill-current')} />
            {active && (
              <span className="absolute -top-1.5 -right-1.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-[#c2440f] text-white text-[9px] leading-3.5 font-bold text-center">
                {selected.length}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent align="start" className="w-64 p-0 gap-0 normal-case tracking-normal font-normal">
        <div className="p-2 border-b border-border">
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une valeur…"
            className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {visible.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">Aucune valeur</p>
          ) : visible.map(value => {
            const checked = selected.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggle(value)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-foreground hover:bg-muted/40 transition-colors"
              >
                <span className={cn(
                  'h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                  checked ? 'bg-[#c2440f] border-[#c2440f]' : 'border-border bg-white'
                )}>
                  {checked && <Check className="h-2.5 w-2.5 text-white" />}
                </span>
                <span className="truncate">{value}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-2 p-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {active ? `${selected.length} sélectionné${selected.length > 1 ? 's' : ''}` : 'Aucun filtre'}
          </span>
          <div className="flex gap-1">
            {q && visible.length > 0 && (
              <button
                type="button"
                onClick={() => onChange(Array.from(new Set([...selected, ...visible])))}
                className="px-2 py-1 text-xs rounded-md hover:bg-muted/50"
              >
                Cocher les résultats
              </button>
            )}
            <button
              type="button"
              disabled={!active}
              onClick={() => onChange([])}
              className="px-2 py-1 text-xs rounded-md text-[#c2440f] hover:bg-[#c2440f]/10 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Effacer
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
