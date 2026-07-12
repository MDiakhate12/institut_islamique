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
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudentListItem } from '@/modules/students/students.types'
import { studentsKeys } from '@/modules/students/students.hooks'

interface StudentFormProps {
  student?: StudentListItem
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function StudentFormDialog({ student, trigger, onSuccess }: StudentFormProps) {
  const [open, setOpen] = useState(false)
  const isEditing = !!student
  const queryClient = useQueryClient()

  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete]    = useTransition()

  const father = student?.guardians?.find(g => g.relationship === 'father' || g.isPrimary) ?? student?.guardians?.[0]
  const mother = student?.guardians?.find(g => g.relationship === 'mother')

  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      firstName:      student?.firstName   ?? '',
      lastName:       student?.lastName    ?? '',
      gender:         student?.gender      ?? 'male',
      isActive:       student?.isActive    ?? true,
      birthDate:      student?.birthDate   ?? '',
      notes:          student?.notes       ?? '',
      parentPhone:    father?.phone        ?? '',
      parentName1:    father?.firstName    ?? '',
      parentName2:    mother?.firstName    ?? '',
      email1:         father?.email        ?? '',
      email2:         mother?.email        ?? '',
      emergencyPhone: father?.emergencyPhone ?? '',
      enrollmentYear: student?.academicYear ?? '',
    },
  })

  const isActive = form.watch('isActive')

  function onSubmit(data: CreateStudentInput) {
    startTransition(async () => {
      const result = isEditing
        ? await updateStudentAction(student.id, data)
        : await createStudentAction(data)

      if (!result.success) { toast.error(result.error); return }
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() })
      toast.success(isEditing ? 'Élève modifié avec succès' : 'Élève créé avec succès')
      form.reset()
      setOpen(false)
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
      form.reset()
      setOpen(false)
      onSuccess?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {trigger ?? (
          <Button size="sm" className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5">
            <Plus className="h-4 w-4" />
            Créer un nouvel élève
          </Button>
        )}
      </DialogTrigger>
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

          {/* Genre */}
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
          {isEditing && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Classes inscrites</label>
                <button
                  type="button"
                  className="text-sm text-[#c2440f] hover:underline"
                >
                  + Ajouter des classes
                </button>
              </div>
              {student.activeClassName ? (
                <div className="flex flex-wrap gap-2 p-2 bg-muted/10 rounded-lg border border-border">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                    {student.activeClassName}
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-muted/10 rounded-lg border border-border text-sm text-muted-foreground text-center">
                  Aucune classe inscrite pour l&apos;instant. Cliquez sur &quot;Ajouter des classes&quot; pour inscrire cet élève.
                </div>
              )}
            </div>
          )}

          {/* Paiements T1/T2/T3 */}
          {isEditing && (
            <div>
              <label className="text-sm font-semibold mb-2 block">Paiements</label>
              <div className="flex items-center gap-2">
                {(['T1', 'T2', 'T3'] as const).map((t) => {
                  const key = t === 'T1' ? 'paymentT1' : t === 'T2' ? 'paymentT2' : 'paymentT3'
                  const paid = student[key as 'paymentT1' | 'paymentT2' | 'paymentT3']
                  return (
                    <span
                      key={t}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border',
                        paid
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-white border-[#c2440f]/40 text-[#c2440f]'
                      )}
                    >
                      <span className={cn(
                        'h-3 w-3 rounded-sm border',
                        paid ? 'bg-green-500 border-green-500' : 'border-[#c2440f]/40'
                      )} />
                      Trimestre {t.slice(1)}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

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
              <Input
                type="tel"
                placeholder="0X XX XX XX XX"
                {...form.register('parentPhone')}
              />
              {!isEditing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Utilisé pour lier le compte parent
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Numéro d&apos;urgence</label>
              <Input
                type="tel"
                placeholder="0X XX XX XX XX"
                {...form.register('emergencyPhone')}
              />
            </div>
          </div>

          {/* Date de naissance */}
          <div>
            <label className="text-sm font-medium mb-1 block">Date de naissance</label>
            <Input type="date" {...form.register('birthDate')} />
          </div>

          {/* Année d'inscription */}
          {isEditing && (
            <div>
              <label className="text-sm font-medium mb-1 block">Année d&apos;inscription</label>
              <Input
                {...form.register('enrollmentYear')}
                placeholder="2026-2027"
                readOnly
                className="bg-muted/30 text-muted-foreground"
                value={student.academicYear ?? '—'}
              />
            </div>
          )}

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
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white min-w-36"
              >
                {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
