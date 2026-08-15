'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageCircle, Send } from 'lucide-react'
import { sendSupportEmailAction } from '@/modules/school/school.actions'

interface SupportForm {
  name: string
  email: string
  subject: string
  message: string
}

export function ContactSupportDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupportForm>()

  async function onSubmit(data: SupportForm) {
    startTransition(async () => {
      const result = await sendSupportEmailAction(data)
      if (!result.success) { toast.error(result.error); return }
      toast.success('Message envoyé ! Nous vous répondrons dans les 24h.')
      reset()
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            Contacter le support
          </Button>
        }
      />

      <DialogContent className="w-[calc(100%-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-[#c2440f]" />
            Contacter le support Qaf
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Une question ou un problème ? Notre équipe vous répond sous 24h.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Votre nom</Label>
              <Input
                {...register('name', { required: 'Requis' })}
                placeholder="Abdeslam Ouili"
                className="h-9 text-sm"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                {...register('email', {
                  required: 'Requis',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email invalide' },
                })}
                type="email"
                placeholder="vous@exemple.fr"
                className="h-9 text-sm"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sujet</Label>
            <Input
              {...register('subject', { required: 'Requis' })}
              placeholder="Problème avec les présences..."
              className="h-9 text-sm"
            />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <textarea
              {...register('message', { required: 'Requis', minLength: { value: 10, message: 'Au moins 10 caractères' } })}
              rows={4}
              placeholder="Décrivez votre problème ou question en détail..."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {isPending ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
