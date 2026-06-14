'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAvailableStudents } from '@/modules/classes/classes.hooks'
import { enrollStudentAction } from '@/modules/classes/classes.actions'
import { classKeys } from '@/modules/classes/classes.hooks'
import type { ClassWithDetails } from '@/modules/classes/classes.types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, UserPlus } from 'lucide-react'

interface Props {
  scheduledClass: ClassWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
  onStudentAdded?: () => void
}

export function AddStudentDialog({ scheduledClass, open, onOpenChange, onStudentAdded }: Props) {
  const [search, setSearch] = useState('')
  const [enrollingId, setEnrollingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const qc = useQueryClient()

  const { data: available, isLoading } = useAvailableStudents(open ? scheduledClass.id : null)

  const filtered = (available ?? []).filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      (s.studentCustomId?.toLowerCase().includes(q) ?? false) ||
      (s.parentPhone?.includes(q) ?? false)
    )
  })

  function handleEnroll(studentId: string) {
    setEnrollingId(studentId)
    startTransition(async () => {
      const result = await enrollStudentAction(scheduledClass.id, studentId)
      setEnrollingId(null)
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: classKeys.enrollments(scheduledClass.id) })
      qc.invalidateQueries({ queryKey: classKeys.available(scheduledClass.id) })
      qc.invalidateQueries({ queryKey: classKeys.lists() })
      toast.success('Élève inscrit avec succès')
      onStudentAdded?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>Add Student to Class</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select a student to add to{' '}
            <span className="font-medium text-foreground">{scheduledClass.name}</span>
            {' '}<span className="text-[#c2440f]">{scheduledClass.fullCode}</span>
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name, ID, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Student list */}
        <div className="max-h-52 overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-5 text-sm text-muted-foreground">
              Chargement...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-5 text-sm text-muted-foreground text-center">
              {(available?.length ?? 0) === 0
                ? 'All students are already enrolled in this class'
                : 'No students match your search'}
            </div>
          ) : (
            filtered.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.studentCustomId && <span className="mr-2">{s.studentCustomId}</span>}
                    {s.parentPhone && <span>Parent: {s.parentPhone}</span>}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleEnroll(s.id)}
                  disabled={enrollingId === s.id}
                  className="bg-[#c2440f] hover:bg-[#a33a0d] text-white h-7 px-2.5 text-xs"
                >
                  {enrollingId === s.id ? '...' : <UserPlus className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
