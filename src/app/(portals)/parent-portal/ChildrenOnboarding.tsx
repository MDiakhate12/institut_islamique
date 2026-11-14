'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChildren, useLinkSuggestions, useConfirmLinkSuggestions } from '@/modules/parents/parents.hooks'

/**
 * Premier écran du parent : propose les enfants trouvés d'après l'e-mail confirmé du compte
 * (un clic suffit), ou, sans enfant lié, les deux chemins possibles au lieu d'un état vide.
 */
export function ChildrenOnboarding() {
  const { data: children, isLoading: childrenLoading } = useChildren()
  const { data: suggestions, isLoading: suggestionsLoading } = useLinkSuggestions()
  const confirm = useConfirmLinkSuggestions()
  const [dismissed, setDismissed] = useState(false)

  if (childrenLoading || suggestionsLoading) return null

  const pending = suggestions ?? []

  if (pending.length > 0 && !dismissed) {
    const names = pending.map(s => `${s.firstName} ${s.lastName}`.trim())
    return (
      <div className="rounded-xl border border-[#2d6a4f]/30 bg-[#2d6a4f]/5 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-[#2d6a4f] mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-gray-900">
              {pending.length === 1 ? 'Est-ce votre enfant ?' : 'Sont-ce vos enfants ?'}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              L&apos;école a enregistré votre adresse e-mail sur : <strong>{names.join(', ')}</strong>.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pl-8">
          <Button
            className="bg-[#2d6a4f] hover:bg-[#1e4535] text-white"
            disabled={confirm.isPending}
            onClick={async () => {
              const result = await confirm.mutateAsync(pending.map(s => s.studentId))
              if (!result.success) { toast.error(result.error); return }
              toast.success(`${result.data.count} élève(s) lié(s) avec succès !`)
            }}
          >
            {confirm.isPending ? 'Liaison…' : 'Oui, les lier à mon compte'}
          </Button>
          <Button variant="outline" disabled={confirm.isPending} onClick={() => setDismissed(true)}>
            Non, ce n&apos;est pas moi
          </Button>
        </div>
      </div>
    )
  }

  if ((children ?? []).length > 0) return null

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-800">Pour commencer</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/parent-portal/children"
          className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-[#2d6a4f]/50 hover:shadow-sm transition-all"
        >
          <Users className="h-6 w-6 text-[#2d6a4f] shrink-0" />
          <div>
            <p className="font-semibold text-gray-900">Mon enfant est déjà inscrit</p>
            <p className="text-sm text-muted-foreground">Retrouver mon enfant avec mon adresse e-mail.</p>
          </div>
        </Link>
        <Link
          href="/parent-portal/enrollment/new"
          className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-[#2d6a4f]/50 hover:shadow-sm transition-all"
        >
          <UserPlus className="h-6 w-6 text-[#2d6a4f] shrink-0" />
          <div>
            <p className="font-semibold text-gray-900">Inscrire un nouvel enfant</p>
            <p className="text-sm text-muted-foreground">Remplir le formulaire d&apos;inscription de l&apos;école.</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
