'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useClasses } from '@/modules/classes/classes.hooks'
import { classKeys } from '@/modules/classes/classes.hooks'
import { enrollStudentsAction } from '@/modules/classes/classes.actions'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, BookOpen } from 'lucide-react'

interface Props {
  studentIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

export function AssignClassDialog({ studentIds, open, onOpenChange, onDone }: Props) {
  const [search, setSearch]   = useState('')
  const [isPending, start]    = useTransition()
  const qc = useQueryClient()
  const { data: classes = [] } = useClasses()

  const filtered = classes.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.fullCode ?? '').toLowerCase().includes(q) ||
      (c.teacherName ?? '').toLowerCase().includes(q)
    )
  })

  function handleAssign(classId: string, className: string) {
    start(async () => {
      const result = await enrollStudentsAction(classId, studentIds)
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: classKeys.lists() })
      qc.invalidateQueries({ queryKey: classKeys.enrollments(classId) })
      qc.invalidateQueries({ queryKey: classKeys.available(classId) })
      toast.success(
        studentIds.length === 1
          ? `Élève affecté à ${className}`
          : `${studentIds.length} élèves affectés à ${className}`
      )
      setSearch('')
      onDone()
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setSearch(''); onOpenChange(false) } }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>Affecter à une classe</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {studentIds.length === 1
              ? '1 élève sélectionné'
              : `${studentIds.length} élèves sélectionnés`}
            {' '}— cliquer sur une classe pour affecter
          </p>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher une classe…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-0.5 -mx-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <BookOpen className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucune classe trouvée</p>
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                type="button"
                disabled={isPending}
                onClick={() => handleAssign(c.id, c.name)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors text-left disabled:opacity-50"
              >
                <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#c2440f] text-white shrink-0">
                  {c.fullCode ?? '—'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">{c.name}</p>
                  {c.teacherName && (
                    <p className="text-xs text-muted-foreground mt-0.5">{c.teacherName}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setSearch(''); onOpenChange(false) }}
          >
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
