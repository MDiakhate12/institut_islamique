'use client'

import { useState } from 'react'
import { Search, AlertTriangle, UserPlus } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGrantRole } from '@/modules/permissions/permissions.hooks'
import { searchMemberByEmailAction } from '@/modules/permissions/permissions.actions'
import { toast } from 'sonner'
import type { AdminSubRole } from '@/lib/constants'
import type { SearchResult } from '@/modules/permissions/permissions.types'

interface RoleConfig {
  label: string
  title: string
  description: string
  actionLabel: string
  actionClass: string
  searchingClass: string
}

const ROLE_CONFIG: Record<AdminSubRole, RoleConfig> = {
  admin: {
    label: 'administrateur',
    title: 'Ajouter un nouvel administrateur',
    description: 'Recherchez un utilisateur existant pour lui accorder des privilèges administratifs.',
    actionLabel: 'Rendre administrateur',
    actionClass: 'bg-[#c2440f] hover:bg-[#a33a0d] text-white',
    searchingClass: 'bg-[#c2440f] hover:bg-[#a33a0d] text-white',
  },
  treasurer: {
    label: 'trésorier',
    title: 'Ajouter un nouveau trésorier',
    description: 'Recherchez un utilisateur existant pour lui accorder l\'accès trésorier. Les trésoriers peuvent gérer le budget, les dépenses, les étudiants, les annonces et plus encore.',
    actionLabel: 'Rendre trésorier',
    actionClass: 'bg-green-600 hover:bg-green-700 text-white',
    searchingClass: 'bg-green-600 hover:bg-green-700 text-white',
  },
  manager: {
    label: 'gestionnaire',
    title: 'Ajouter un nouveau gestionnaire',
    description: 'Recherchez un utilisateur existant pour lui accorder l\'accès gestionnaire. Les gestionnaires ont un accès administrateur complet sauf pour le budget et les dépenses.',
    actionLabel: 'Rendre gestionnaire',
    actionClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    searchingClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
}

interface Props {
  open: boolean
  onClose: () => void
  role: AdminSubRole
  schoolName: string
}

export function AddRoleDialog({ open, onClose, role, schoolName }: Props) {
  const [email, setEmail] = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const grant = useGrantRole()
  const config = ROLE_CONFIG[role]

  async function handleSearch() {
    if (!email.trim()) return
    setSearching(true)
    setResult(null)
    try {
      const res = await searchMemberByEmailAction(email.trim(), role)
      if (res.success) {
        setResult(res.data)
      } else {
        toast.error(res.error)
      }
    } finally {
      setSearching(false)
    }
  }

  async function handleGrant() {
    const res = await grant.mutateAsync({ email: email.trim(), role })
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(`Accès ${config.label} accordé`)
    handleClose()
  }

  function handleClose() {
    setEmail('')
    setResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-lg">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-[#7a4f30]" />
          <DialogTitle className="text-base font-semibold">{config.title}</DialogTitle>
        </div>
        <p className="text-sm text-muted-foreground -mt-1">
          {config.description} — <span className="font-medium">{schoolName}</span>
        </p>

        <div className="space-y-2">
          <Label className="text-sm font-medium">E-mail</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={email}
                onChange={e => { setEmail(e.target.value); setResult(null) }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="utilisateur@exemple.com"
                className="pl-9 border-[#c2440f] focus-visible:ring-[#c2440f]/30"
                autoFocus
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={searching || !email.trim()}
              className="bg-[#7a4f30] hover:bg-[#5c3820] text-white shrink-0"
            >
              {searching ? 'Recherche...' : 'Rechercher'}
            </Button>
          </div>
        </div>

        {/* Not found state */}
        {result && !result.found && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Aucun compte trouvé pour <strong>{email}</strong>. Vous pouvez quand même accorder
                l&apos;accès — ils l&apos;auront dès qu&apos;ils rejoindront l&apos;école.
              </span>
            </div>
            <Button
              onClick={handleGrant}
              disabled={grant.isPending}
              className={`w-full ${config.actionClass}`}
            >
              + Ajouter {email} quand même
            </Button>
          </div>
        )}

        {/* Found state */}
        {result && result.found && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Résultats de la recherche</p>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{result.fullName ?? email}</p>
                <p className="text-xs text-muted-foreground">{result.email}</p>
              </div>
              {result.alreadyHasRole ? (
                <span className="text-xs text-muted-foreground italic">Déjà {config.label}</span>
              ) : (
                <Button
                  onClick={handleGrant}
                  disabled={grant.isPending}
                  className={config.actionClass}
                  size="sm"
                >
                  {config.actionLabel}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
