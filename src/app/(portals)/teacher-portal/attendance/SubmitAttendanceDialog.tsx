'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { AttendanceStatus } from '@/modules/attendance/attendance.types'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
  counts: { present: number; late: number; absent: number; total: number }
}

export default function SubmitAttendanceDialog({ open, onClose, onConfirm, isLoading, counts }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Soumettre la présence</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">
            Vous êtes sur le point de soumettre la présence pour{' '}
            <span className="font-semibold text-foreground">{counts.total} étudiant{counts.total > 1 ? 's' : ''}</span> :
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-foreground font-medium">{counts.present} Présent{counts.present > 1 ? 's' : ''}(s)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-foreground font-medium">{counts.late} En retard</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-foreground font-medium">{counts.absent} Absent{counts.absent > 1 ? 's' : ''}(s)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            style={{ backgroundColor: '#c2440f' }}
            className="text-white hover:opacity-90"
          >
            {isLoading ? 'Soumission...' : 'Soumettre'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
