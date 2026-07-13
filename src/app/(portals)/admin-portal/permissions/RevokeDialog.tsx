'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRevokeRole } from '@/modules/permissions/permissions.hooks'
import { toast } from 'sonner'
import type { AdminSubRole } from '@/lib/constants'

const ROLE_LABELS: Record<AdminSubRole, string> = {
  admin: 'administrateur',
  treasurer: 'trésorier',
  manager: 'gestionnaire',
}

interface Props {
  open: boolean
  onClose: () => void
  memberId: string
  memberName: string
  role: AdminSubRole
}

export function RevokeDialog({ open, onClose, memberId, memberName, role }: Props) {
  const [text, setText] = useState('')
  const revoke = useRevokeRole()

  const roleLabel = ROLE_LABELS[role]
  const confirmed = text === 'REVOKE'

  async function handleRevoke() {
    const result = await revoke.mutateAsync(memberId)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success(`Accès ${roleLabel} révoqué pour ${memberName}`)
    setText('')
    onClose()
  }

  function handleClose() {
    setText('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <DialogTitle className="text-base font-semibold text-gray-900">
              Révoquer l&apos;accès {roleLabel}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Êtes-vous sûr de vouloir supprimer les droits d&apos;{roleLabel} de{' '}
              <span className="font-medium text-gray-800">{memberName}</span> ? Ils perdront
              immédiatement l&apos;accès au portail d&apos;administration.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-widest text-gray-600 uppercase">
            Tapez &quot;REVOKE&quot; pour confirmer
          </Label>
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="REVOKE"
            className={confirmed ? 'border-red-400 focus-visible:ring-red-300' : ''}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            disabled={!confirmed || revoke.isPending}
            onClick={handleRevoke}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Révoquer l&apos;accès
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
