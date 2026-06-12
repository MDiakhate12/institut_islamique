/**
 * PATTERN DE RÉFÉRENCE — Composant formulaire
 * Toujours React Hook Form + Zod + Server Action + toast.
 * Jamais de fetch() ou axios dans un composant.
 */

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { createStudentAction } from '../students.actions'
import { createStudentSchema, type CreateStudentInput } from '../students.schema'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CreateStudentFormProps {
  schoolId: string
  onSuccess?: () => void
}

export function CreateStudentForm({ schoolId, onSuccess }: CreateStudentFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      gender: 'male',
    },
  })

  function onSubmit(data: CreateStudentInput) {
    startTransition(async () => {
      // Appel Server Action — jamais fetch() directement
      const result = await createStudentAction(schoolId, data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Élève créé avec succès')
      form.reset()
      onSuccess?.()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prénom</FormLabel>
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
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input placeholder="Nom de l'élève" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Genre</FormLabel>
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

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Création...' : 'Créer l\'élève'}
        </Button>
      </form>
    </Form>
  )
}
