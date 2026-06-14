'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useClassEnrollments, classKeys } from '@/modules/classes/classes.hooks'
import { unenrollStudentAction, transferStudentAction } from '@/modules/classes/classes.actions'
import type { ClassWithDetails } from '@/modules/classes/classes.types'
import { AddStudentDialog } from './AddStudentDialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserRound, Plus, ArrowLeftRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  scheduledClass: ClassWithDetails
  allClasses: ClassWithDetails[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClassStudentsDialog({ scheduledClass, allClasses, open, onOpenChange }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [transferEnrollmentId, setTransferEnrollmentId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const qc = useQueryClient()

  const { data: enrollments, isLoading } = useClassEnrollments(open ? scheduledClass.id : null)

  // Classes available for transfer (same school, different class, same subject)
  const transferTargets = allClasses.filter(c =>
    c.id !== scheduledClass.id &&
    (c.subjectCode === scheduledClass.subjectCode || !scheduledClass.subjectCode)
  )

  function handleUnenroll(enrollmentId: string, name: string) {
    if (!confirm(`Retirer ${name} de cette classe ?`)) return
    startTransition(async () => {
      const result = await unenrollStudentAction(enrollmentId)
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: classKeys.enrollments(scheduledClass.id) })
      qc.invalidateQueries({ queryKey: classKeys.lists() })
      toast.success(`${name} retiré de la classe`)
    })
  }

  function handleTransfer(enrollmentId: string, newClassId: string) {
    setTransferEnrollmentId(null)
    startTransition(async () => {
      const result = await transferStudentAction(enrollmentId, newClassId)
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: classKeys.enrollments(scheduledClass.id) })
      qc.invalidateQueries({ queryKey: classKeys.lists() })
      toast.success('Élève transféré avec succès')
    })
  }

  const count = enrollments?.length ?? 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <DialogTitle className="text-base leading-snug">{scheduledClass.name}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {scheduledClass.fullCode && (
                    <span className="text-[#c2440f] font-medium">{scheduledClass.fullCode}</span>
                  )}
                  {scheduledClass.section && <span> • Section {scheduledClass.section}</span>}
                  {scheduledClass.teacherName && (
                    <span> • Taught by {scheduledClass.teacherName}</span>
                  )}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-bold text-foreground leading-none">{count}</div>
                <div className="text-xs text-muted-foreground">Enrolled</div>
              </div>
            </div>
          </DialogHeader>

          {/* Student list */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                Chargement...
              </div>
            ) : count === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <UserRound className="h-6 w-6 text-muted-foreground/40 mb-1.5" />
                <p className="text-sm text-muted-foreground">Aucun élève dans cette classe</p>
              </div>
            ) : (
              enrollments!.map(e => (
                <div key={e.enrollmentId} className="flex items-center gap-3 px-1 py-1.5">
                  {/* Avatar placeholder */}
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none">{e.firstName} {e.lastName}</p>
                    {e.parentPhone && (
                      <p className="text-xs text-muted-foreground mt-0.5">Parent: {e.parentPhone}</p>
                    )}
                  </div>
                  {/* Status badge */}
                  <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Enrolled
                  </span>
                  {/* Transfer button */}
                  <div className="relative">
                    <button
                      type="button"
                      title="Transfer to another class"
                      onClick={() => setTransferEnrollmentId(
                        transferEnrollmentId === e.enrollmentId ? null : e.enrollmentId
                      )}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                    </button>
                    {/* Transfer dropdown */}
                    {transferEnrollmentId === e.enrollmentId && (
                      <div className="absolute right-0 top-7 z-20 bg-white border border-border rounded-lg shadow-lg py-1 min-w-52">
                        <p className="px-3 py-1 text-xs text-muted-foreground font-medium">
                          Transfer to another class
                        </p>
                        {transferTargets.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-muted-foreground italic">
                            No other classes available
                          </p>
                        ) : (
                          transferTargets.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleTransfer(e.enrollmentId, c.id)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                            >
                              <span className="font-medium">{c.fullCode || c.name}</span>
                              {c.teacherName && (
                                <span className="text-muted-foreground text-xs ml-1">— {c.teacherName}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {/* Remove button */}
                  <button
                    type="button"
                    title="Remove from class"
                    onClick={() => handleUnenroll(e.enrollmentId, `${e.firstName} ${e.lastName}`)}
                    className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className={cn(
            'flex items-center pt-3 border-t border-border',
            count > 0 ? 'justify-between' : 'justify-end'
          )}>
            {count > 0 && (
              <p className="text-xs text-muted-foreground">{count} student{count !== 1 ? 's' : ''} in class</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setAddOpen(true)}
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Student
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 text-muted-foreground"
                onClick={() => toast.info("La page de présences sera disponible bientôt")}
              >
                Take Attendance
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add student dialog */}
      <AddStudentDialog
        scheduledClass={scheduledClass}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </>
  )
}
