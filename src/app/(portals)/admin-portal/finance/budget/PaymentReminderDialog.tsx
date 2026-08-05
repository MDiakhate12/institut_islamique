'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStudents } from '@/modules/students/students.hooks'
import { usePayments, useRemindUnpaidParents } from '@/modules/payments/payments.hooks'
import { PAYMENT_PERIOD_LABELS } from '@/modules/payments/payments.labels'

const PERIODS = ['trimester_1', 'trimester_2', 'trimester_3'] as const

export function PaymentReminderDialog() {
  const [step, setStep] = useState<'select' | 'confirm' | null>(null)
  const [period, setPeriod] = useState<string | null>(null)
  const { data: students = [] } = useStudents()
  const { data: payments = [] } = usePayments()
  const remind = useRemindUnpaidParents()

  function unpaidCount(p: string): number {
    const paidStudentIds = new Set(
      payments
        .filter(pay => pay.status === 'verified' && (pay.period === p || pay.period === 'annually'))
        .map(pay => pay.studentId)
    )
    return students.filter(s => s.isActive && !paidStudentIds.has(s.id)).length
  }

  function reset() {
    setStep(null)
    setPeriod(null)
  }

  async function handleSend() {
    if (!period) return
    const result = await remind.mutateAsync(period)
    if (result.success) reset()
  }

  return (
    <Dialog open={step !== null} onOpenChange={v => { if (!v) reset(); else setStep('select') }}>
      <DialogTrigger render={
        <Button className="bg-[#7a4f30] hover:bg-[#5c3820] text-white gap-1.5 flex-1">
          <Bell className="h-4 w-4" /> Rappeler les parents impayés
        </Button>
      } />
      <DialogContent className="max-w-md">
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#c2440f]" /> Envoyer des rappels de paiement
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Sélectionnez le trimestre pour lequel envoyer des rappels de paiement. Seuls les parents avec des étudiants impayés recevront des notifications.
            </p>
            <div className="space-y-2 pt-2">
              {PERIODS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'w-full text-left border rounded-lg p-3 transition-colors',
                    period === p ? 'border-[#c2440f] bg-orange-50' : 'border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <p className="font-medium text-sm">{PAYMENT_PERIOD_LABELS[p]}</p>
                  <p className="text-xs text-muted-foreground">{unpaidCount(p)} étudiants impayés</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={reset}>Annuler</Button>
              <Button
                disabled={!period}
                onClick={() => setStep('confirm')}
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
              >
                Continuer
              </Button>
            </div>
          </>
        )}

        {step === 'confirm' && period && (
          <>
            <DialogHeader>
              <DialogTitle>Confirmer l&apos;envoi des rappels</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Vous êtes sur le point d&apos;envoyer des rappels de paiement pour {PAYMENT_PERIOD_LABELS[period]} aux parents de {unpaidCount(period)} étudiant(s) impayé(s).
            </p>
            <p className="text-sm text-muted-foreground">
              Les parents recevront un e-mail leur rappelant le paiement en attente.
            </p>
            <p className="text-sm font-medium">Voulez-vous continuer ?</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('select')}>Annuler</Button>
              <Button
                disabled={remind.isPending}
                onClick={handleSend}
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
              >
                Envoyer les rappels
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
