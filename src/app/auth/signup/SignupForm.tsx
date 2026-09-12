'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { signUpAction } from '../actions'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, Mail, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const signupSchema = z
  .object({
    fullName:        z.string().min(2, 'Nom requis'),
    email:           z.string().email('Email invalide'),
    schoolId:        z.string().min(1, 'Veuillez sélectionner une école'),
    phone:           z.string().min(8, 'Numéro de téléphone requis'),
    isParent:        z.boolean(),
    isTeacher:       z.boolean(),
    isAdmin:         z.boolean(),
    password:        z.string().min(8, 'Minimum 8 caractères'),
    confirmPassword: z.string(),
    acceptedTerms:   z.boolean().refine(v => v === true, { message: 'Vous devez accepter les conditions' }),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
  .refine(d => d.isAdmin || d.isParent || d.isTeacher, {
    message: 'Sélectionnez au moins un rôle',
    path: ['isParent'],
  })

type SignupInput = z.infer<typeof signupSchema>

interface Props {
  schools:          { id: string; name: string }[]
  isAdminInvite?:   boolean
  isTeacherInvite?: boolean
  prefilledEmail?:  string
  prefilledSchoolId?: string
}

export function SignupForm({
  schools, isAdminInvite = false, isTeacherInvite = false, prefilledEmail = '', prefilledSchoolId = '',
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState(false)
  const hideRoleChoice = isAdminInvite || isTeacherInvite

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '', email: prefilledEmail, schoolId: prefilledSchoolId, phone: '',
      isParent: !hideRoleChoice, isTeacher: isTeacherInvite, isAdmin: isAdminInvite,
      password: '', confirmPassword: '', acceptedTerms: false,
    },
  })

  function onSubmit(data: SignupInput) {
    startTransition(async () => {
      const result = await signUpAction({
        fullName:  data.fullName,
        email:     data.email,
        schoolId:  data.schoolId,
        phone:     data.phone,
        isParent:  data.isParent,
        isTeacher: data.isTeacher,
        isAdmin:   data.isAdmin,
        password:  data.password,
      })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      if (result?.needsConfirmation) {
        setConfirmed(true)
      }
    })
  }

  if (confirmed) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
          <Mail className="h-7 w-7 text-green-600" />
        </div>
        <h3 className="font-semibold text-gray-900">Vérifiez votre email</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Un lien de confirmation a été envoyé à votre adresse email. Cliquez sur le lien pour
          activer votre compte.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        {/* Badge admin invite */}
        {isAdminInvite && (
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <Shield className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Invitation administrateur</p>
              <p className="text-xs text-amber-700">Vous avez été invité(e) à gérer cette école.</p>
            </div>
          </div>
        )}
        {isTeacherInvite && (
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <Shield className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Invitation enseignant</p>
              <p className="text-xs text-amber-700">
                Vous avez été invité(e) à rejoindre cette école en tant qu&apos;enseignant.
              </p>
            </div>
          </div>
        )}

        {/* Nom complet */}
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

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="votre@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* École */}
        <FormField
          control={form.control}
          name="schoolId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>École *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner votre école">
                      {(v: string) => schools.find(s => s.id === v)?.name ?? v}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {schools.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Téléphone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de téléphone *</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="0X XX XX XX XX" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rôles — masqués en mode invitation (admin ou enseignant) */}
        {!hideRoleChoice && <div className="space-y-2">
          <FormLabel>Je suis *</FormLabel>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="isParent"
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                    field.value
                      ? 'border-[#c2440f] bg-[#c2440f]/5 text-[#c2440f]'
                      : 'border-border text-muted-foreground hover:border-[#c2440f]/40'
                  )}
                >
                  {field.value && <CheckCircle className="h-4 w-4" />}
                  Inscription parent
                </button>
              )}
            />
            <FormField
              control={form.control}
              name="isTeacher"
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                    field.value
                      ? 'border-[#c2440f] bg-[#c2440f]/5 text-[#c2440f]'
                      : 'border-border text-muted-foreground hover:border-[#c2440f]/40'
                  )}
                >
                  {field.value && <CheckCircle className="h-4 w-4" />}
                  Inscription enseignant
                </button>
              )}
            />
          </div>
          {form.formState.errors.isParent && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.isParent.message}
            </p>
          )}
        </div>}

        {/* Mot de passe */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mot de passe *</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmer le mot de passe *</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CGU */}
        <FormField
          control={form.control}
          name="acceptedTerms"
          render={({ field }) => (
            <FormItem>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!field.value}
                  onChange={e => field.onChange(e.target.checked || undefined)}
                  className="mt-0.5 h-4 w-4 accent-[#c2440f] cursor-pointer shrink-0"
                />
                <span className="text-sm text-muted-foreground leading-snug">
                  J'accepte les{' '}
                  <span className="text-[#c2440f] underline cursor-pointer">
                    Conditions Générales d'Utilisation
                  </span>{' '}
                  et la{' '}
                  <span className="text-[#c2440f] underline cursor-pointer">
                    Politique de confidentialité
                  </span>
                </span>
              </label>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending || !form.watch('acceptedTerms')}
          className="w-full bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-2"
        >
          {isPending ? (
            'Création du compte…'
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Créer un compte
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
