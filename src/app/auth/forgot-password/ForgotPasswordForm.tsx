'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { forgotPasswordAction } from '../actions'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const schema = z.object({
  email: z.string().email('Adresse email invalide'),
})

type Input = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  function onSubmit(data: Input) {
    startTransition(async () => {
      const result = await forgotPasswordAction(data.email)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-[#2d6a4f]" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Email envoyé !</h3>
        <p className="text-sm text-muted-foreground">
          Si un compte existe pour <strong>{form.getValues('email')}</strong>, vous recevrez un lien de réinitialisation dans quelques minutes.
        </p>
        <p className="text-xs text-muted-foreground">Pensez à vérifier vos spams.</p>
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-[#2d6a4f] hover:underline font-medium mt-2">
          <ArrowLeft className="h-4 w-4" />
          Retour à la connexion
        </Link>
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="votre@email.com" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-nat-cta hover:bg-nat-cta-hover text-white"
        >
          {isPending ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
        </Button>
        <div className="text-center">
          <Link href="/auth/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la connexion
          </Link>
        </div>
      </form>
    </Form>
  )
}
