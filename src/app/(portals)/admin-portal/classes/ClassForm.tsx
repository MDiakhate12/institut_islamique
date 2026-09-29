'use client'

import { useTransition, useState, useRef } from 'react'
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
import { ChevronDown, ChevronUp } from 'lucide-react'

const CURRENT_YEAR = '2025-2026'

const CURRICULUM_TEMPLATE = `# Programme

## Tranche d'âge
[Indiquer la tranche d'âge cible]

## Prérequis
- Aucun prérequis

## Trimestre 1
-

## Trimestre 2
-

## Trimestre 3
-

## Objectifs
-

## Évaluation
-

## Livres
-

## Vue d'ensemble
`

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
  const [curriculumOpen, setCurriculumOpen] = useState(isEditing && !!scheduledClass?.curriculum)
  const qc = useQueryClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  function insertAtCursor(prefix: string, suffix = '', placeholder = 'texte') {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const current = form.getValues('curriculum') ?? ''
    const selected = current.slice(start, end) || placeholder
    const newValue = current.slice(0, start) + prefix + selected + suffix + current.slice(end)
    form.setValue('curriculum', newValue, { shouldDirty: true })
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    }, 0)
  }

  function insertLinePrefix(prefix: string) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const current = form.getValues('curriculum') ?? ''
    const lineStart = current.lastIndexOf('\n', start - 1) + 1
    const newValue = current.slice(0, lineStart) + prefix + current.slice(lineStart)
    form.setValue('curriculum', newValue, { shouldDirty: true })
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + prefix.length, start + prefix.length) }, 0)
  }

  function insertSection(label: string) {
    const ta = textareaRef.current
    if (!ta) return
    const current = form.getValues('curriculum') ?? ''
    const sep = current && !current.endsWith('\n') ? '\n' : ''
    form.setValue('curriculum', current + sep + `\n## ${label}\n`, { shouldDirty: true })
    setTimeout(() => { ta.focus(); ta.scrollTop = ta.scrollHeight }, 0)
  }

  function startFromTemplate() {
    form.setValue('curriculum', CURRICULUM_TEMPLATE, { shouldDirty: true })
    setTimeout(() => { textareaRef.current?.focus() }, 0)
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

      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Programme — collapsible */}
          {(() => {
            const { ref: regRef, ...curriculumRest } = form.register('curriculum')
            const hasCurriculum = !!form.watch('curriculum')
            return (
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCurriculumOpen(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    Programme
                    <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
                    {hasCurriculum && !curriculumOpen && (
                      <span className="text-xs text-[#2d6a4f]">• Défini</span>
                    )}
                  </span>
                  {curriculumOpen
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  }
                </button>

                {curriculumOpen && (
                  <div className="border-t border-border">
                    {/* Barre d'outils */}
                    <div className="px-2 py-2 border-b border-border flex flex-wrap items-center gap-1.5 bg-muted/20">
                      {/* Formatage */}
                      {[
                        { label: 'H1', title: 'Titre 1',   action: () => insertLinePrefix('# '),       cls: 'font-bold' },
                        { label: 'H2', title: 'Titre 2',   action: () => insertLinePrefix('## '),      cls: 'font-semibold' },
                        { label: 'B',  title: 'Gras',      action: () => insertAtCursor('**', '**'),   cls: 'font-bold' },
                        { label: 'I',  title: 'Italique',  action: () => insertAtCursor('*', '*'),     cls: 'italic' },
                      ].map(btn => (
                        <button key={btn.label} type="button" title={btn.title} onClick={btn.action}
                          className={cn('px-2 py-0.5 text-xs rounded border border-border hover:bg-muted bg-white transition-colors', btn.cls)}>
                          {btn.label}
                        </button>
                      ))}
                      <div className="w-px h-4 bg-border mx-0.5" />
                      {/* Sections */}
                      {[
                        "Tranche d'âge", 'Prérequis',
                        'Trimestre 1', 'Trimestre 2', 'Trimestre 3',
                        'Objectifs', 'Évaluation', 'Livres', 'Vue d\'ensemble',
                      ].map(s => (
                        <button key={s} type="button" onClick={() => insertSection(s)}
                          className="px-2 py-0.5 text-xs rounded border border-border hover:bg-muted bg-white transition-colors whitespace-nowrap">
                          {s}
                        </button>
                      ))}
                      <div className="w-px h-4 bg-border mx-0.5" />
                      <button type="button" onClick={startFromTemplate}
                        className="px-2 py-0.5 text-xs rounded border border-[#2d6a4f]/40 text-[#2d6a4f] hover:bg-[#2d6a4f]/10 bg-white transition-colors font-medium whitespace-nowrap">
                        › Gabarit complet
                      </button>
                    </div>

                    {/* Zone de texte */}
                    <textarea
                      {...curriculumRest}
                      ref={(el) => { textareaRef.current = el; regRef(el) }}
                      rows={10}
                      placeholder="Décrivez le programme de cette classe..."
                      className="w-full px-3 py-2.5 text-sm focus:outline-none resize-y font-mono min-h-[200px] block"
                    />

                    {/* Astuce */}
                    <div className="px-3 py-1.5 bg-muted/30 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Astuce : utilisez la barre d&apos;outils pour formater. Les boutons de section insèrent directement des titres courants.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

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
