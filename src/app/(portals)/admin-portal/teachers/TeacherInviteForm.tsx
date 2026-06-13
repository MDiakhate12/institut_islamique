'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { inviteTeacherSchema, type InviteTeacherInput } from '@/modules/teachers/teachers.schema'
import { inviteTeacherAction } from '@/modules/teachers/teachers.actions'
import { useQueryClient } from '@tanstack/react-query'
import { teachersKeys } from '@/modules/teachers/teachers.hooks'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TeacherInviteFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function TeacherInviteForm({ onSuccess, onCancel }: TeacherInviteFormProps) {
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const form = useForm<InviteTeacherInput>({
    resolver: zodResolver(inviteTeacherSchema),
    defaultValues: {
      email: '',
      fullName: '',
      phone: '',
      teacherType: 'volunteer',
    },
  })

  function onSubmit(data: InviteTeacherInput) {
    startTransition(async () => {
      const result = await inviteTeacherAction(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Invitation envoyée avec succès')
      queryClient.invalidateQueries({ queryKey: teachersKeys.lists() })
      form.reset()
      onSuccess?.()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse email *</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="enseignant@exemple.fr"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom complet *</FormLabel>
              <FormControl>
                <Input placeholder="Prénom Nom" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
              <FormLabel>Type d'enseignant *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
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

        <p className="text-xs text-muted-foreground">
          Un email d'invitation sera envoyé à l'enseignant pour qu'il crée son compte.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-[#c2440f] hover:bg-[#a33a0d] text-white min-w-32"
          >
            {isPending ? 'Envoi...' : "Inviter l'enseignant"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
