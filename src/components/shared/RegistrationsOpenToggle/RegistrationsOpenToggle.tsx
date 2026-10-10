'use client'

import { useState } from 'react'
import { DoorOpen, DoorClosed } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { useSchool, useUpdateSchoolSettings } from '@/modules/school/school.hooks'
import { cn } from '@/lib/utils'

/**
 * Ouvrir / fermer les nouvelles inscriptions depuis les pages Inscriptions et Formulaires
 * d'inscription (même réglage que Paramètres de l'école → `allowNewRegistrations`).
 * N'enregistre QUE ce réglage (patch fusionné côté serveur) : ne peut pas écraser un autre réglage.
 * La page appelante attend `useSchool()` dans son loader (§7.23).
 */
export function RegistrationsOpenToggle() {
  const { data: school } = useSchool()
  const updateSettings = useUpdateSchoolSettings()
  const [confirming, setConfirming] = useState(false)

  if (!school) return null
  const open = school.settings?.allowNewRegistrations !== false
  const year = school.settings?.academicYear ?? ''

  return (
    <div className={cn(
      'flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 px-4 py-3',
      open ? 'border-[#2d6a4f]/30 bg-[#f4f9f3]' : 'border-red-200 bg-red-50',
    )}>
      <div className="flex items-start gap-3">
        {open
          ? <DoorOpen className="h-5 w-5 text-[#2d6a4f] shrink-0 mt-0.5" />
          : <DoorClosed className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
        <div>
          <p className={cn('text-sm font-semibold', open ? 'text-[#2d6a4f]' : 'text-red-700')}>
            Nouvelles inscriptions {open ? 'ouvertes' : 'fermées'}{year ? ` pour ${year}` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {open
              ? 'Les familles peuvent inscrire un nouvel élève (formulaire public et portail parent).'
              : 'Le formulaire public et le portail parent affichent « Inscriptions fermées ». Les réinscriptions restent possibles.'}
          </p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        {open ? 'Ouvertes' : 'Fermées'}
        <Switch
          checked={open}
          disabled={updateSettings.isPending}
          onCheckedChange={() => setConfirming(true)}
          aria-label="Autoriser les nouvelles inscriptions"
        />
      </label>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={open ? `Fermer les nouvelles inscriptions${year ? ` pour ${year}` : ''} ?` : `Ouvrir les nouvelles inscriptions${year ? ` pour ${year}` : ''} ?`}
        description={open
          ? 'Les familles ne pourront plus inscrire de nouvel élève (formulaire public et portail parent). Les réinscriptions restent possibles.'
          : 'Les familles pourront inscrire un nouvel élève depuis le formulaire public et le portail parent.'}
        confirmLabel={open ? 'Fermer les inscriptions' : 'Ouvrir les inscriptions'}
        destructive={open}
        onConfirm={() => {
          updateSettings.mutate({ allowNewRegistrations: !open })
          setConfirming(false)
        }}
      />
    </div>
  )
}
