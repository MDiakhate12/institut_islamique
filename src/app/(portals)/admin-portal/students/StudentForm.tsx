'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createStudentSchema, type CreateStudentInput } from '@/modules/students/students.schema'
import { createStudentAction, updateStudentAction } from '@/modules/students/students.actions'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Student } from '@/modules/students/students.types'

interface StudentFormProps {
  student?: Student   // si présent → mode édition
  onSuccess?: () => void
}

export function StudentForm({ student, onSuccess }: StudentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!student

  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      firstName: student?.firstName ?? '',
      lastName: student?.lastName ?? '',
      gender: student?.gender ?? 'male',
      birthDate: student?.birthDate ?? '',
      notes: student?.notes ?? '',
    },
  })

  function onSubmit(data: CreateStudentInput) {
    startTransition(async () => {
      const result = isEditing
        ? await updateStudentAction(student.id, data)
        : await createStudentAction(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(isEditing ? 'Élève modifié avec succès' : 'Élève créé avec succès')
      onSuccess?.()
      if (!isEditing) router.push('/admin-portal/students')
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom *</FormLabel>
                <FormControl>
                  <Input placeholder="Prénom de l'élève" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom *</FormLabel>
                <FormControl>
                  <Input placeholder="Nom de l'élève" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Genre *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Masculin</SelectItem>
                    <SelectItem value="female">Féminin</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="birthDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de naissance</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notes sur l'élève (optionnel)"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-[#c2440f] hover:bg-[#a33a0d] text-white min-w-28"
          >
            {isPending
              ? isEditing ? 'Modification...' : 'Création...'
              : isEditing ? 'Enregistrer' : "Créer l'élève"
            }
          </Button>
        </div>
      </form>
    </Form>
  )
}
