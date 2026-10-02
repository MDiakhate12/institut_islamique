'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useUpdateWageStatus } from '@/modules/wages/wages.hooks'
import type { WageEntry } from '@/modules/wages/wages.types'

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', approved: 'Approuvé', paid: 'Payé', rejected: 'Rejeté',
}

interface Props {
  entry: WageEntry | null
  onClose: () => void
}

export function EditWageRecordDialog({ entry, onClose }: Props) {
  // Valeurs initiales lues une fois au montage : le parent passe key={entry.id} (§7.16)
  const [status, setStatus] = useState(entry?.status ?? 'pending')
  const [rate, setRate] = useState(entry ? (entry.hourlyRateCents / 100).toString() : '0')
  const updateStatus = useUpdateWageStatus()

  if (!entry) return null

  const rateCents = Math.round((parseFloat(rate) || 0) * 100)
  const amount = rateCents * entry.hoursWorked

  async function handleSave() {
    if (!entry) return
    const result = await updateStatus.mutateAsync({ id: entry.id, status: status as 'pending' | 'approved' | 'rejected' | 'paid', hourlyRateCents: rateCents })
    if (result.success) onClose()
  }

  return (
    <Dialog open={!!entry} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;entrée de salaire</DialogTitle>
          <p className="text-sm text-muted-foreground">Modifier le statut et le taux de cette entrée</p>
        </DialogHeader>

        <div className="rounded-lg bg-gray-50 p-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Enseignant :</p>
            <p className="font-medium">{entry.teacherName}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Date :</p>
            <p className="font-medium">{new Date(entry.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          {entry.classId && (
            <>
              <div>
                <p className="text-muted-foreground text-xs">Code classe :</p>
                <p className="font-medium">{entry.classCode ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Classe :</p>
                <p className="font-medium">{entry.className ?? '—'}</p>
              </div>
            </>
          )}
          <div>
            <p className="text-muted-foreground text-xs">Heures :</p>
            <p className="font-medium">{entry.hoursWorked}h</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Montant :</p>
            <p className="font-medium">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 100)}</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Modifier le statut</label>
          <Select value={status} onValueChange={v => v && setStatus(v)}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => STATUS_LABELS[v] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Taux horaire</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <Input type="number" step="0.01" className="pl-7" value={rate} onChange={e => setRate(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            → {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 100)}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={updateStatus.isPending}
            onClick={handleSave}
            className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white"
          >
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
