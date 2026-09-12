'use client'

import { Check, X, Clock } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { useSchool } from '@/modules/school/school.hooks'
import { useChildrenPaymentStatus } from '@/modules/payments/payments.hooks'
import { MarkAsPaidDialog } from './MarkAsPaidDialog'

const PERIOD_LABELS: Record<'t1' | 't2' | 't3', string> = {
  t1: 'Trimestre 1',
  t2: 'Trimestre 2',
  t3: 'Trimestre 3',
}

function StatusRow({ label, status, annual }: { label: string; status: 'paid' | 'pending' | 'unpaid'; annual?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm">{label}</span>
      {status === 'paid' && (
        <span className="flex items-center gap-1 text-sm font-medium text-green-600">
          {annual ? 'Payé (Annuel)' : 'Payé'} <Check className="h-4 w-4" />
        </span>
      )}
      {status === 'pending' && (
        <span className="flex items-center gap-1 text-sm font-medium text-orange-500">En attente de vérification <Clock className="h-4 w-4" /></span>
      )}
      {status === 'unpaid' && (
        <span className="flex items-center gap-1 text-sm font-medium text-red-500">Non payé <X className="h-4 w-4" /></span>
      )}
    </div>
  )
}

export function PaymentStatusClient() {
  const { data: school } = useSchool()
  const { data: children = [], isLoading } = useChildrenPaymentStatus()
  const academicYear = school?.settings?.academicYear ?? ''

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <PageHeader title="Statut de paiement" subtitle={`Année scolaire : ${academicYear}`} />

      {isLoading ? (
        <p className="text-center text-gray-500 py-8 text-sm">Chargement...</p>
      ) : children.length === 0 ? (
        <p className="text-center text-gray-500 py-8 text-sm bg-white rounded-xl border">Aucun enfant lié à votre compte.</p>
      ) : (
        <div className="space-y-4">
          {children.map(c => (
            <div key={c.studentId} className="bg-white rounded-xl border p-4">
              <p className="font-semibold mb-2">{c.studentName}</p>
              <div className="divide-y">
                <StatusRow label={PERIOD_LABELS.t1} status={c.t1} annual={c.isAnnual} />
                <StatusRow label={PERIOD_LABELS.t2} status={c.t2} annual={c.isAnnual} />
                <StatusRow label={PERIOD_LABELS.t3} status={c.t3} annual={c.isAnnual} />
              </div>
            </div>
          ))}
        </div>
      )}

      {children.length > 0 && (
        <div className="space-y-2">
          <MarkAsPaidDialog children={children} academicYear={academicYear} />
          <p className="text-xs text-center text-muted-foreground">Votre paiement sera vérifié par un administrateur.</p>
        </div>
      )}
    </div>
  )
}
