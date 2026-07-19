'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useActiveClasses } from '@/modules/students/students.hooks'
import { Loader2, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClassOption {
  id: string
  classCode: string
  name: string
  teacherName: string | null
}

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  excludeClassIds: string[]
  onAdd: (cls: ClassOption) => void
}

export function AddClassDialog({ open, onOpenChange, excludeClassIds, onAdd }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ClassOption | null>(null)

  const { data: allClasses, isLoading } = useActiveClasses()

  const filtered = (allClasses ?? [])
    .filter(c => !excludeClassIds.includes(c.id))
    .filter(c => {
      const q = search.toLowerCase()
      return (
        c.classCode.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.teacherName ?? '').toLowerCase().includes(q)
      )
    })

  const handleConfirm = () => {
    if (!selected) return
    onAdd(selected)
    setSelected(null)
    setSearch('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setSelected(null); setSearch('') } onOpenChange(v) }}>
      <DialogContent className="max-w-md">
        <DialogTitle>Ajouter une classe</DialogTitle>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Rechercher par code, nom ou enseignant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-6">
            {search ? 'Aucune classe correspondante' : 'Aucune classe disponible'}
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {filtered.map(cls => (
              <button
                key={cls.id}
                type="button"
                onClick={() => setSelected(cls.id === selected?.id ? null : cls)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                  selected?.id === cls.id
                    ? 'border-[#c2440f] bg-orange-50'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-[#7a4f30] text-white px-2 py-0.5 rounded">
                      {cls.classCode || '—'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-1 truncate">{cls.name}</p>
                  {cls.teacherName && (
                    <p className="text-xs text-gray-500 truncate">Prof : {cls.teacherName}</p>
                  )}
                </div>
                {selected?.id === cls.id && (
                  <Check className="w-4 h-4 text-[#c2440f] shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            disabled={!selected}
            onClick={handleConfirm}
            style={{ backgroundColor: '#c2440f' }}
            className="text-white hover:opacity-90"
          >
            Ajouter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
