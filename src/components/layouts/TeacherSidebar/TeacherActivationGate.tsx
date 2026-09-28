'use client'

import { useState, useTransition } from 'react'
import { Shield, Mail, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { activateTeacherAction, requestActivationCodeAction } from '@/modules/teachers/teachers.actions'

interface Props {
  adminEmails: string[]
}

export function TeacherActivationGate({ adminEmails }: Props) {
  const [code, setCode] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isSending, startSendTransition] = useTransition()
  const [codeSent, setCodeSent] = useState(false)

  function handleRequestCode() {
    startSendTransition(async () => {
      const result = await requestActivationCodeAction()
      if (!result.success) {
        toast.error(result.error)
      } else {
        setCodeSent(true)
        toast.success('Code envoyé ! Vérifiez votre boîte mail.')
      }
    })
  }

  function handleActivate() {
    if (!code.trim()) return
    startTransition(async () => {
      const result = await activateTeacherAction(code.trim())
      if (!result.success) {
        toast.error(result.error)
      }
      // On success, the server action redirects — no client-side nav needed
    })
  }

  return (
    <div className="min-h-full bg-[#f4f9f3] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl overflow-hidden shadow-lg border border-[#e8d5c4]">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#9ecf94] to-[#163828] p-8 flex flex-col items-center text-white">
            <div className="h-14 w-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center mb-4">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold">Vérification de l'enseignant</h2>
            <p className="text-white/70 text-xs tracking-widest mt-1 uppercase">Contrôle de sécurité</p>
          </div>

          {/* Body */}
          <div className="bg-white p-8 space-y-6">
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              Pour accéder aux ressources des enseignants, veuillez vérifier votre identité en
              entrant votre identifiant unique d'enseignant.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Code d'identifiant enseignant
              </label>
              <Input
                placeholder="Entrez votre identifiant enseignant"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleActivate}
              disabled={!code.trim() || isPending}
              className="w-full bg-[#2d6a4f] hover:bg-[#1e4535] text-white gap-2"
            >
              {isPending ? 'Vérification…' : 'Vérifier l\'identité →'}
            </Button>

            {/* Request code by email */}
            <div className="rounded-lg bg-[#f4f9f3] border border-[#cde6c8] p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#1e4535]">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold">Recevoir mon code par email</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Vous n'avez pas encore reçu votre code d'activation ? Demandez un renvoi directement sur votre adresse email.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestCode}
                disabled={isSending || codeSent}
                className="w-full border-[#2d6a4f] text-[#2d6a4f] hover:bg-[#2d6a4f] hover:text-white gap-2 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                {isSending ? 'Envoi en cours…' : codeSent ? 'Code envoyé ✓' : 'Renvoyer mon code d\'activation'}
              </Button>
            </div>

            {/* Admin contacts */}
            {adminEmails.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold">Contacter un administrateur</span>
                </div>
                <p className="text-xs text-amber-700">
                  Vous pouvez aussi contacter directement les administrateurs de votre école :
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {adminEmails.map(email => (
                    <a
                      key={email}
                      href={`mailto:${email}`}
                      className="px-2.5 py-1 bg-white border border-amber-200 rounded-full text-xs text-amber-800 font-medium hover:bg-amber-100 transition-colors"
                    >
                      {email}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
