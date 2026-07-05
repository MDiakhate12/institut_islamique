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
import type { Student } from '@/modules/students/students.types'
import { studentsKeys } from '@/modules/students/students.hooks'

interface StudentFormProps {
  student?: Student
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function StudentFormDialog({ student, trigger, onSuccess }: StudentFormProps) {
  const [open, setOpen] = useState(false)
  const isEditing = !!student
  const queryClient = useQueryClient()

  // ── Form state ici (survit à la fermeture du dialog) ──────────────────────
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete]    = useTransition()

  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      firstName: student?.firstName ?? '',
      lastName:  student?.lastName  ?? '',
      gender:    student?.gender    ?? 'male',
      isActive:  student?.isActive  ?? true,
      birthDate: student?.birthDate ?? '',
      notes:     student?.notes     ?? '',
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

          {/* Genre ou ID élève */}
          <div className="grid grid-cols-2 gap-3">
            {isEditing && student.studentCustomId ? (
              <div>
                <label className="text-sm font-medium mb-1 block text-muted-foreground">ID Élève</label>
                <Input value={student.studentCustomId} readOnly className="bg-muted/30 text-muted-foreground" />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-1 block">Genre *</label>
                <select
                  {...form.register('gender')}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30"
                >
                  <option value="">Sélectionner le genre</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            )}
          </div>

          {/* Genre (edit) + Date de naissance */}
          {isEditing ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Genre</label>
                <select
                  {...form.register('gender')}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Date de naissance</label>
                <Input type="date" {...form.register('birthDate')} />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium mb-1 block">Date de naissance</label>
              <Input type="date" {...form.register('birthDate')} />
            </div>
          )}

          {/* Statut actif */}
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
