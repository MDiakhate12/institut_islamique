'use client'

import { useTransition, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { createStudentSchema, type CreateStudentInput } from '@/modules/students/students.schema'
import { createStudentAction, updateStudentAction, deleteStudentAction } from '@/modules/students/students.actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudentListItem } from '@/modules/students/students.types'
import { studentsKeys } from '@/modules/students/students.hooks'
import { AddClassDialog } from './AddClassDialog'

interface ClassRow {
  id: string
  classCode: string
  name: string
  teacherName: string | null
  paidT1: boolean
  paidT2: boolean
  paidT3: boolean
  isNew?: boolean
}

function buildYearOptions(): string[] {
  const y = new Date().getFullYear()
  return [`${y - 1}-${y}`, `${y}-${y + 1}`, `${y + 1}-${y + 2}`]
}

interface Props {
  student?: StudentListItem
  trigger?: React.ReactElement
  onSuccess?: () => void
}

export function StudentFormDialog({ student, trigger, onSuccess }: Props) {
  const [open, setOpen]     = useState(false)
  const [addClassOpen, setAddClassOpen] = useState(false)
  const isEditing = !!student
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete]    = useTransition()

  const father = student?.guardians?.find(g => g.relationship === 'father' || g.isPrimary) ?? student?.guardians?.[0]
  const mother = student?.guardians?.find(g => g.relationship === 'mother')

  // Local class enrollment state
  const [localEnrollments, setLocalEnrollments] = useState<ClassRow[]>(() =>
    (student?.enrollments ?? []).map(e => ({
      id:          e.classId,
      classCode:   e.classCode,
      name:        e.className,
      teacherName: e.teacherName,
      paidT1:      e.paidT1,
      paidT2:      e.paidT2,
      paidT3:      e.paidT3,
    }))
  )
  const [removedClassIds, setRemovedClassIds] = useState<string[]>([])

  const yearOptions = buildYearOptions()

  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      firstName:      student?.firstName    ?? '',
      lastName:       student?.lastName     ?? '',
      gender:         student?.gender       ?? 'male',
      isActive:       student?.isActive     ?? true,
      birthDate:      student?.birthDate    ?? '',
      notes:          student?.notes        ?? '',
      parentPhone:    father?.phone         ?? '',
      parentName1:    father?.firstName     ?? '',
      parentName2:    mother?.firstName     ?? '',
      email1:         father?.email         ?? '',
      email2:         mother?.email         ?? '',
      emergencyPhone: father?.emergencyPhone ?? '',
      enrollmentYear: student?.enrollmentYear ?? yearOptions[1],
    },
  })

  const isActive = form.watch('isActive')

  function resetAndClose() {
    form.reset()
    setLocalEnrollments((student?.enrollments ?? []).map(e => ({
      id: e.classId, classCode: e.classCode, name: e.className,
      teacherName: e.teacherName, paidT1: e.paidT1, paidT2: e.paidT2, paidT3: e.paidT3,
    })))
    setRemovedClassIds([])
    setOpen(false)
  }

  function toggleClassPayment(classId: string, field: 'paidT1' | 'paidT2' | 'paidT3') {
    setLocalEnrollments(prev => prev.map(e =>
      e.id === classId ? { ...e, [field]: !e[field] } : e
    ))
  }

  function removeClass(classId: string, isNew: boolean) {
    if (!isNew) setRemovedClassIds(prev => [...prev, classId])
    setLocalEnrollments(prev => prev.filter(e => e.id !== classId))
  }

  function onSubmit(data: CreateStudentInput) {
    startTransition(async () => {
      // Compute new classes (marked isNew) and payment updates
      const newClasses      = localEnrollments.filter(e => e.isNew)
      const classIdsToAdd   = newClasses.map(e => e.id)
      const paymentUpdates  = localEnrollments.map(e => ({
        classId: e.id, t1: e.paidT1, t2: e.paidT2, t3: e.paidT3,
      }))

      let result
      if (isEditing) {
        result = await updateStudentAction(student.id, {
          ...data,
          classIdsToAdd,
          classIdsToRemove: removedClassIds,
          paymentUpdates,
        })
      } else {
        const firstEnrollment = localEnrollments[0]
        result = await createStudentAction({
          ...data,
          classIdsToAdd,
          paymentT1: firstEnrollment?.paidT1 ?? false,
          paymentT2: firstEnrollment?.paidT2 ?? false,
          paymentT3: firstEnrollment?.paidT3 ?? false,
        })
      }

      if (!result.success) { toast.error(result.error); return }
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() })
      toast.success(isEditing ? 'Élève modifié avec succès' : 'Élève créé avec succès')
      resetAndClose()
      onSuccess?.()
    })
  }

  function handleDelete() {
    if (!student) return
    startDelete(async () => {
      const result = await deleteStudentAction(student.id)
      if (!result.success) { toast.error(result.error); return }
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() })
      toast.success('Élève supprimé')
      resetAndClose()
      onSuccess?.()
    })
  }

  const excludedIds = localEnrollments.map(e => e.id)

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) resetAndClose(); else setOpen(true) }}>
        <DialogTrigger render={
          trigger ?? (
            <Button size="sm" className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5">
              <Plus className="h-4 w-4" />
              Créer un nouvel élève
            </Button>
          )
        } />

        <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {isEditing ? "Modifier l'élève" : 'Ajouter un nouvel élève'}
            </DialogTitle>
            {isEditing && (
              <p className="text-sm text-muted-foreground">
                Mettre à jour les informations de l&apos;élève
              </p>
            )}
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            {/* Prénom / Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Prénom *</label>
                <Input placeholder="Prénom" {...form.register('firstName')} />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Nom de famille *</label>
                <Input placeholder="Nom" {...form.register('lastName')} />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Genre + Année d'inscription */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Genre</label>
                <select
                  {...form.register('gender')}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30"
                >
                  <option value="male">Masculin</option>
                  <option value="female">Féminin</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Année d&apos;inscription</label>
                <select
                  {...form.register('enrollmentYear')}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30"
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nom du parent 1 / Nom du parent 2 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Nom du parent 1</label>
                <Input placeholder="Nom du père / tuteur" {...form.register('parentName1')} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Nom du parent 2</label>
                <Input placeholder="Nom de la mère / tuteur" {...form.register('parentName2')} />
              </div>
            </div>

            {/* Toggle inscrit */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-sm text-muted-foreground">L&apos;élève est actuellement inscrit et actif</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-emerald-600">Inscrit</span>
                <button
                  type="button"
                  onClick={() => form.setValue('isActive', !isActive)}
                  className={cn(
                    'relative w-10 h-5 rounded-full transition-colors duration-200',
                    isActive ? 'bg-emerald-500' : 'bg-gray-300'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </button>
              </div>
            </div>

            {/* Classes inscrites */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Classes inscrites</label>
                <button
                  type="button"
                  onClick={() => setAddClassOpen(true)}
                  className="text-sm text-[#c2440f] hover:underline font-medium"
                >
                  + Ajouter une classe
                </button>
              </div>

              {localEnrollments.length === 0 ? (
                <div className="p-3 bg-muted/10 rounded-lg border border-border text-sm text-muted-foreground text-center">
                  Aucune classe. Cliquez sur &quot;Ajouter une classe&quot; pour inscrire cet élève.
                </div>
              ) : (
                <div className="space-y-3">
                  {localEnrollments.map(e => (
                    <div key={e.id} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-[#7a4f30] text-white px-2 py-0.5 rounded">
                            {e.classCode || '—'}
                          </span>
                          <span className="text-sm font-medium text-gray-700 truncate max-w-48">{e.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeClass(e.id, e.isNew ?? false)}
                          className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Paiement chips */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Paiement :</span>
                        {(['paidT1', 'paidT2', 'paidT3'] as const).map((field, idx) => (
                          <button
                            key={field}
                            type="button"
                            onClick={() => toggleClassPayment(e.id, field)}
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
                              e[field]
                                ? 'bg-green-50 border-green-300 text-green-700'
                                : 'bg-white border-gray-300 text-gray-500 hover:border-[#c2440f] hover:text-[#c2440f]'
                            )}
                          >
                            T{idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* E-mail 1 / E-mail 2 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">E-mail 1</label>
                <Input type="email" placeholder="E-mail principal" {...form.register('email1')} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">E-mail 2</label>
                <Input type="email" placeholder="E-mail secondaire" {...form.register('email2')} />
              </div>
            </div>

            {/* Téléphone / Numéro d'urgence */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Téléphone du tuteur</label>
                <Input type="tel" placeholder="0X XX XX XX XX" {...form.register('parentPhone')} />
                {!isEditing && (
                  <p className="text-xs text-muted-foreground mt-1">Utilisé pour lier le compte parent</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Numéro d&apos;urgence</label>
                <Input type="tel" placeholder="0X XX XX XX XX" {...form.register('emergencyPhone')} />
              </div>
            </div>

            {/* Date de naissance */}
            <div>
              <label className="text-sm font-medium mb-1 block">Date de naissance</label>
              <Input type="date" {...form.register('birthDate')} />
            </div>

            {/* Commentaire */}
            <div>
              <label className="text-sm font-medium mb-1 block">Commentaire</label>
              <textarea
                {...form.register('notes')}
                placeholder="Ajouter des notes sur l'élève..."
                rows={3}
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30 resize-none"
              />
            </div>

            {/* Boutons */}
            <div className={cn('flex items-center gap-2 pt-2', isEditing ? 'justify-between' : 'justify-end')}>
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting ? 'Suppression...' : "Supprimer l'élève"}
                </Button>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetAndClose}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="bg-[#c2440f] hover:bg-[#a33a0d] text-white min-w-36"
                >
                  {isPending ? 'Enregistrement...' : isEditing ? 'Enregistrer' : "Créer l'élève"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add class dialog rendered outside the main dialog */}
      <AddClassDialog
        open={addClassOpen}
        onOpenChange={setAddClassOpen}
        excludeClassIds={excludedIds}
        onAdd={cls => {
          setLocalEnrollments(prev => [
            ...prev,
            { id: cls.id, classCode: cls.classCode, name: cls.name, teacherName: cls.teacherName, paidT1: false, paidT2: false, paidT3: false, isNew: true },
          ])
        }}
      />
    </>
  )
}
