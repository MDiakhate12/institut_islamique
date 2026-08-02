'use client'

import { useState } from 'react'
import { Search, Check, ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type StudentOption = { id: string; name: string }

interface Props {
  options: StudentOption[]
  selected: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
}

export function StudentMultiSelect({ options, selected, onChange, placeholder = 'Sélectionner des étudiants...' }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
  const selectedNames = options.filter(o => selected.includes(o.id)).map(o => o.name)

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  return (
    <div>
      <p className="text-sm font-medium mb-1.5">Étudiants ({selected.length} sélectionné(s))</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-left hover:bg-gray-50"
          >
            <span className={cn('truncate', selectedNames.length === 0 && 'text-muted-foreground')}>
              {selectedNames.length > 0 ? selectedNames.join(', ') : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          </button>
        } />
        <PopoverContent className="w-96 p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                autoFocus
                className="pl-8 h-8"
                placeholder="Rechercher un élève..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">Aucun élève trouvé</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                    selected.includes(o.id) ? 'bg-orange-50' : 'hover:bg-gray-50'
                  )}
                >
                  <span className={cn(
                    'shrink-0 w-4 h-4 rounded border flex items-center justify-center',
                    selected.includes(o.id) ? 'bg-[#c2440f] border-[#c2440f]' : 'border-gray-300'
                  )}>
                    {selected.includes(o.id) && <Check className="w-3 h-3 text-white" />}
                  </span>
                  {o.name}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
