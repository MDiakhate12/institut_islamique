'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useStudentPayments } from '@/modules/students/students.hooks'
import { Loader2 } from 'lucide-react'

const PERIOD_LABELS: Record<string, string> = {
  annually:    'Annuel',
  trimester_1: 'Trimestre 1',
  trimester_2: 'Trimestre 2',
  trimester_3: 'Trimestre 3',
}

const METHOD_LABELS: Record<string, string> = {
  cash:    'Espèces',
  check:   'Chèque',
  paypal:  'PayPal',
  venmo:   'Venmo',
  no_fees: 'Sans frais',
  other:   'Autre',
}

const STATUS_COLORS: Record<string, string> = {
  verified: 'bg-green-100 text-green-700',
  pending:  'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  verified: 'Vérifié',
  pending:  'En attente',
  rejected: 'Rejeté',
}

function formatAmount(cents: number, currency: string) {
  if (cents === 0) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'EUR' }).format(cents / 100)
}

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  studentId: string
  studentName: string
}

export function StudentPaymentsModal({ open, onOpenChange, studentId, studentName }: Props) {
  const { data, isLoading } = useStudentPayments(studentId, open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Paiements de {studentName}</DialogTitle>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !data?.length ? (
          <p className="text-center text-gray-500 py-8 text-sm">Aucun paiement enregistré</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left py-2 pr-4">Période</th>
                  <th className="text-left py-2 pr-4">Mode</th>
                  <th className="text-right py-2 pr-4">Montant</th>
                  <th className="text-left py-2 pr-4">Statut</th>
                  <th className="text-left py-2">Parent</th>
                </tr>
              </thead>
              <tbody>
                {data.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-700">
                      {p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">
                      {PERIOD_LABELS[p.period] ?? p.period}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">
                      {METHOD_LABELS[p.method] ?? p.method}
                    </td>
                    <td className="py-2 pr-4 text-right font-medium">
                      {formatAmount(p.amountCents, p.currency)}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="py-2 text-gray-600">{p.parentName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
