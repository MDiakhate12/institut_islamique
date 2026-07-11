'use client'

import { useState, useTransition } from 'react'
import { Shield, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { activateTeacherAction } from '@/modules/teachers/teachers.actions'

interface Props {
  adminEmails: string[]
}

export function TeacherActivationGate({ adminEmails }: Props) {
  const [code, setCode] = useState('')
  const [isPending, startTransition] = useTransition()

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
    <div className="min-h-full bg-[#fdf6f0] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl overflow-hidden shadow-lg border border-[#e8d5c4]">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#DBA571] to-[#8B4429] p-8 flex flex-col items-center text-white">
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
              className="w-full bg-[#7a4f30] hover:bg-[#5c3820] text-white gap-2"
            >
              {isPending ? 'Vérification…' : 'Vérifier l\'identité →'}
            </Button>

            {/* Admin contacts */}
            {adminEmails.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold">Besoin d'aide ?</span>
                </div>
                <p className="text-xs text-amber-700">
                  Contactez les administrateurs de votre école pour obtenir votre code :
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {adminEmails.map(email => (
                    <span
                      key={email}
                      className="px-2.5 py-1 bg-white border border-amber-200 rounded-full text-xs text-amber-800 font-medium"
                    >
                      {email}
                    </span>
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
