'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAvailableStudents } from '@/modules/classes/classes.hooks'
import { enrollStudentsAction } from '@/modules/classes/classes.actions'
import { classKeys } from '@/modules/classes/classes.hooks'
import type { ClassWithDetails } from '@/modules/classes/classes.types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Check, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  scheduledClass: ClassWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
  onStudentAdded?: () => void
}

export function AddStudentDialog({ scheduledClass, open, onOpenChange, onStudentAdded }: Props) {
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [, startTransition]           = useTransition()
  const [isPending, setIsPending]     = useState(false)
  const qc = useQueryClient()

  const { data: available, isLoading } = useAvailableStudents(open ? scheduledClass.id : null)

  const filtered = (available ?? []).filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      (s.studentCustomId?.toLowerCase().includes(q) ?? false)
    )
  })

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(s => s.id)))
    }
  }

  function handleClose() {
    setSearch('')
    setSelected(new Set())
    onOpenChange(false)
  }

  function handleEnroll() {
    if (selected.size === 0) return
    setIsPending(true)
    startTransition(async () => {
      const result = await enrollStudentsAction(scheduledClass.id, Array.from(selected))
      setIsPending(false)
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: classKeys.enrollments(scheduledClass.id) })
      qc.invalidateQueries({ queryKey: classKeys.available(scheduledClass.id) })
      qc.invalidateQueries({ queryKey: classKeys.lists() })
      toast.success(
        selected.size === 1
          ? 'Élève inscrit avec succès'
          : `${selected.size} élèves inscrits avec succès`
      )
      onStudentAdded?.()
      handleClose()
    })
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selected.has(s.id))

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter des élèves à la classe</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Classe :{' '}
            <span className="font-medium text-foreground">{scheduledClass.name}</span>
            {' '}<span className="text-[#c2440f] font-medium">{scheduledClass.fullCode}</span>
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher par nom ou ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Select-all row */}
        {!isLoading && filtered.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className={cn(
              'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
              allFilteredSelected
                ? 'bg-[#c2440f] border-[#c2440f]'
                : 'border-border'
            )}>
              {allFilteredSelected && <Check className="h-2.5 w-2.5 text-white" />}
            </span>
            {allFilteredSelected ? 'Tout désélectionner' : `Tout sélectionner (${filtered.length})`}
          </button>
        )}

        {/* Student list */}
        <div className="max-h-60 overflow-y-auto space-y-0.5 -mx-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Users className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground text-center">
                {(available?.length ?? 0) === 0
                  ? 'Tous les élèves sont déjà dans cette classe'
                  : 'Aucun élève ne correspond à la recherche'}
              </p>
            </div>
          ) : (
            filtered.map(s => {
              const isSelected = selected.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                    isSelected
                      ? 'bg-[#c2440f]/8 border border-[#c2440f]/20'
                      : 'hover:bg-muted/40'
                  )}
                >
                  <span className={cn(
                    'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    isSelected
                      ? 'bg-[#c2440f] border-[#c2440f]'
                      : 'border-border'
                  )}>
                    {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none">
                      {s.lastName.toUpperCase()} {s.firstName}
                    </p>
                    {s.studentCustomId && (
                      <p className="text-xs text-muted-foreground mt-0.5">ID : {s.studentCustomId}</p>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {selected.size > 0
              ? `${selected.size} élève${selected.size > 1 ? 's' : ''} sélectionné${selected.size > 1 ? 's' : ''}`
              : 'Aucune sélection'}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selected.size === 0 || isPending}
              onClick={handleEnroll}
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
            >
              {isPending
                ? 'Inscription…'
                : selected.size === 0
                  ? 'Ajouter des élèves'
                  : `Ajouter ${selected.size} élève${selected.size > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
