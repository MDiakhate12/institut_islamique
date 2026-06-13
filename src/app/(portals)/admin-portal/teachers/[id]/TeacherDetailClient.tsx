'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateTeacherAction, removeTeacherAction } from '@/modules/teachers/teachers.actions'
import { useQueryClient } from '@tanstack/react-query'
import { teachersKeys } from '@/modules/teachers/teachers.hooks'
import { updateTeacherSchema, type UpdateTeacherInput } from '@/modules/teachers/teachers.schema'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { BookOpen, Mail, Phone, Calendar, AlertTriangle } from 'lucide-react'
import type { Teacher } from '@/modules/teachers/teachers.types'

function getInitials(fullName: string | null): string {
  if (!fullName) return '?'
  return fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

interface TeacherDetailClientProps {
  teacher: Teacher
  classCount: number
}

export function TeacherDetailClient({ teacher, classCount }: TeacherDetailClientProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isUpdating, startUpdate] = useTransition()
  const [isRemoving, startRemove] = useTransition()

  const form = useForm<UpdateTeacherInput>({
    resolver: zodResolver(updateTeacherSchema),
    defaultValues: {
      fullName: teacher.fullName ?? '',
      phone: teacher.phone ?? '',
      teacherType: teacher.teacherType ?? 'volunteer',
    },
  })

  function onSubmit(data: UpdateTeacherInput) {
    startUpdate(async () => {
      const result = await updateTeacherAction(teacher.id, data)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Enseignant modifié avec succès')
      queryClient.invalidateQueries({ queryKey: teachersKeys.all })
    })
  }

  function handleRemove() {
    if (!confirm(`Retirer ${teacher.fullName ?? 'cet enseignant'} de l'école ? Cette action est irréversible.`)) return
    startRemove(async () => {
      const result = await removeTeacherAction(teacher.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Enseignant retiré de l\'école')
      queryClient.invalidateQueries({ queryKey: teachersKeys.lists() })
      router.push('/admin-portal/teachers')
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={teacher.fullName ?? 'Enseignant'}
        subtitle="Profil de l'enseignant"
        actions={
          teacher.teacherType ? <StatusBadge status={teacher.teacherType} /> : undefined
        }
      />

      {/* Carte profil */}
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center gap-4 mb-5">
          <Avatar className="h-16 w-16">
            <AvatarImage src={teacher.avatarUrl ?? undefined} alt={teacher.fullName ?? ''} />
            <AvatarFallback className="bg-[#f9e8d8] text-[#7a4f30] font-bold text-lg">
              {getInitials(teacher.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{teacher.fullName ?? '—'}</h2>
            {teacher.isPending && (
              <span className="text-sm text-orange-600 font-medium">En attente d'activation du compte</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate">{teacher.email}</span>
          </div>
          {teacher.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{teacher.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>{classCount} classe{classCount !== 1 ? 's' : ''} actives</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Depuis le {new Date(teacher.createdAt).toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
      </div>

      {/* Formulaire édition */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold mb-5">Modifier les informations</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet</FormLabel>
                  <FormControl>
                    <Input placeholder="Prénom Nom" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+33 6 XX XX XX XX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teacherType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'enseignant</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="volunteer">Bénévole</SelectItem>
                        <SelectItem value="paid">Payé</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin-portal/teachers')}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isUpdating}
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white min-w-28"
              >
                {isUpdating ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Zone de danger */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <h2 className="text-base font-semibold text-red-700">Zone de danger</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Retirer cet enseignant supprimera son accès au portail. Le compte utilisateur reste intact.
        </p>
        <Button
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-50"
          onClick={handleRemove}
          disabled={isRemoving}
        >
          {isRemoving ? 'Suppression...' : 'Retirer de l\'école'}
        </Button>
      </div>
    </div>
  )
}
