'use client'

import { useTransition, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { createClassSchema, type CreateClassInput } from '@/modules/classes/classes.schema'
import { createClassAction, updateClassAction, deleteClassAction } from '@/modules/classes/classes.actions'
import { classKeys } from '@/modules/classes/classes.hooks'
import { SUBJECT_CODES, SUBJECT_LABELS, getSubjectColor } from '@/modules/classes/classes.types'
import type { ClassWithDetails } from '@/modules/classes/classes.types'
import type { TeacherListItem } from '@/modules/teachers/teachers.types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CURRENT_YEAR = '2025-2026'

interface Props {
  scheduledClass?: ClassWithDetails
  teachers?: TeacherListItem[]
  rooms?: string[]
  trigger?: React.ReactElement
  onSuccess?: () => void
}

export function ClassFormDialog({
  scheduledClass,
  teachers = [],
  rooms = [],
  trigger,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false)
  const isEditing = !!scheduledClass
  const qc = useQueryClient()

  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  const form = useForm<CreateClassInput>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      subject:            scheduledClass?.subject            ?? '',
      name:               scheduledClass?.name               ?? '',
      curriculum:         scheduledClass?.curriculum         ?? '',
      room:               scheduledClass?.room               ?? '',
      teacherId:          scheduledClass?.teacherId          ?? null,
      assistantTeacherId: scheduledClass?.assistantTeacherId ?? null,
      academicYear:       scheduledClass?.academicYear       ?? CURRENT_YEAR,
    },
  })

  const teacherId          = form.watch('teacherId')
  const assistantTeacherId = form.watch('assistantTeacherId')
  const selectedSubject    = form.watch('subject')

  const currentRoom = scheduledClass?.room
  const roomOptions = currentRoom && !rooms.includes(currentRoom)
    ? [...rooms, currentRoom]
    : rooms

  function onSubmit(data: CreateClassInput) {
    startTransition(async () => {
      const result = isEditing
        ? await updateClassAction(scheduledClass.id, data)
        : await createClassAction(data)

      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: classKeys.lists() })
      toast.success(isEditing ? 'Classe modifiée' : 'Classe créée')
      form.reset()
      setOpen(false)
      onSuccess?.()
    })
  }

  function handleDelete() {
    if (!scheduledClass) return
    startDelete(async () => {
      const result = await deleteClassAction(scheduledClass.id)
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: classKeys.lists() })
      toast.success('Classe supprimée')
      setOpen(false)
      onSuccess?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset() }}>
      {trigger && <DialogTrigger render={trigger} />}

      <DialogContent className="w-[calc(100%-2rem)] max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier la classe' : 'Ajouter une nouvelle classe'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">

          {/* Matière */}
          <div>
            <label className="text-sm font-medium mb-2 block">Matière</label>
            <div className="flex gap-2 flex-wrap">
              {SUBJECT_CODES.map(code => {
                const colors = getSubjectColor(code)
                const active = selectedSubject === code
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => form.setValue('subject', active ? '' : code, { shouldValidate: true })}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-semibold border-2 transition-all',
                      active
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : 'bg-white text-muted-foreground border-border hover:border-muted-foreground'
                    )}
                  >
                    {SUBJECT_LABELS[code] ?? code}
                  </button>
                )
              })}
            </div>
            {form.formState.errors.subject && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.subject.message}</p>
            )}
          </div>

          {/* Nom de la classe */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Nom de la classe</label>
            <Input
              placeholder="ex. Coran Débutants, Niveau Intermédiaire..."
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Salle */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Salle de classe</label>
            <select
              {...form.register('room')}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2d6a4f]/30"
            >
              <option value="">Aucune</option>
              {roomOptions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Programme */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Programme
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optionnel)</span>
            </label>
            <textarea
              {...form.register('curriculum')}
              rows={5}
              placeholder="Décrivez le programme de cette classe... (markdown supporté : # Titre, ## Section, - liste)"
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2d6a4f]/30 resize-y font-mono"
            />
          </div>

          {/* Enseignants */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Enseignant principal</label>
              <select
                value={teacherId ?? ''}
                onChange={e => form.setValue('teacherId', e.target.value || null)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2d6a4f]/30"
              >
                <option value="">Aucun</option>
                {teachers.filter(t => t.id !== assistantTeacherId).map(t => (
                  <option key={t.id} value={t.id}>{t.fullName ?? t.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Enseignant assistant
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <select
                value={assistantTeacherId ?? ''}
                onChange={e => form.setValue('assistantTeacherId', e.target.value || null)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2d6a4f]/30"
              >
                <option value="">Aucun</option>
                {teachers.filter(t => t.id !== teacherId).map(t => (
                  <option key={t.id} value={t.id}>{t.fullName ?? t.email}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className={cn(
            'flex items-center gap-2 pt-2',
            isEditing ? 'justify-between' : 'justify-end'
          )}>
            {isEditing && (
              <Button type="button" variant="destructive" size="sm" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white min-w-40"
              >
                {isPending
                  ? 'Enregistrement...'
                  : isEditing ? 'Enregistrer les modifications' : 'Créer la classe'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
