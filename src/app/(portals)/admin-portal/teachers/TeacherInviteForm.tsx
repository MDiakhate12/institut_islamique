'use client'

import { useState, useTransition } from 'react'
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
import { Copy, CheckCircle, Key } from 'lucide-react'

interface TeacherInviteFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function TeacherInviteForm({ onSuccess, onCancel }: TeacherInviteFormProps) {
  const [isPending, startTransition] = useTransition()
  const [activationCode, setActivationCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
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

      queryClient.invalidateQueries({ queryKey: teachersKeys.lists() })
      setActivationCode(result.data.id)
    })
  }

  async function copyCode() {
    if (!activationCode) return
    try {
      await navigator.clipboard.writeText(activationCode)
    } catch {
      // fallback silencieux si clipboard refusé
    }
    setCopied(true)
    toast.success('Code copié dans le presse-papier')
    setTimeout(() => setCopied(false), 2000)
  }

  if (activationCode) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Enseignant créé</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Partagez ce code avec l'enseignant pour qu'il active son compte.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <Key className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">Code d'activation</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-white border border-amber-200 rounded px-3 py-2 text-gray-800 break-all">
              {activationCode}
            </code>
            <div className="relative group shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyCode}
                className="border-amber-300 text-amber-800 hover:bg-green-600 hover:border-green-600 hover:text-white transition-colors"
              >
                {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded invisible group-hover:visible pointer-events-none whitespace-nowrap z-10">
                {copied ? 'Copié !' : 'Copier le code'}
              </div>
            </div>
          </div>
          <p className="text-xs text-amber-700">
            L'enseignant doit créer un compte sur <strong>/auth/signup</strong> avec l'email{' '}
            <strong>{form.getValues('email')}</strong>, puis entrer ce code pour activer son accès.
          </p>
        </div>

        <Button
          type="button"
          className="w-full bg-[#c2440f] hover:bg-[#a33a0d] text-white"
          onClick={() => { setActivationCode(null); form.reset(); onSuccess?.() }}
        >
          Fermer
        </Button>
      </div>
    )
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
                <Input type="email" placeholder="enseignant@exemple.fr" {...field} />
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
          L'enseignant devra créer son compte avec cet email et entrer le code d'activation que vous recevrez.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-[#c2440f] hover:bg-[#a33a0d] text-white min-w-32"
          >
            {isPending ? 'Création...' : "Créer l'enseignant"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
