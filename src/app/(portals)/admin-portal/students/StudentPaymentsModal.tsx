'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useStudentPayments, studentsKeys } from '@/modules/students/students.hooks'
import { useDeletePayment } from '@/modules/payments/payments.hooks'
import { PaymentFormDialog } from '../finance/budget/PaymentFormDialog'
import type { EditablePayment } from '@/modules/payments/payments.types'
import type { StudentPayment } from '@/modules/students/students.types'
import { Loader2, Pencil, Trash2 } from 'lucide-react'

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

function toEditablePayment(p: StudentPayment): EditablePayment {
  return {
    id: p.id,
    studentId: p.studentId,
    parentName: p.parentName,
    amount: p.amountCents,
    category: p.category,
    period: p.period,
    method: p.method,
    financialOption: p.financialOption,
    status: p.status,
    date: p.date,
    notes: p.notes,
  }
}

export function StudentPaymentsModal({ open, onOpenChange, studentId, studentName }: Props) {
  const { data, isLoading } = useStudentPayments(studentId, open)
  const deletePayment = useDeletePayment()
  const [editing, setEditing] = useState<EditablePayment | null>(null)
  const queryClient = useQueryClient()
  const refreshStudentPayments = () => queryClient.invalidateQueries({ queryKey: studentsKeys.payments(studentId) })

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
                  <th className="text-left py-2 pr-4">Parent</th>
                  <th className="text-right py-2">Actions</th>
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
                    <td className="py-2 pr-4 text-gray-600">{p.parentName ?? '—'}</td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Modifier"
                          onClick={() => setEditing(toEditablePayment(p))}
                          className="p-1.5 rounded hover:bg-gray-100 text-[#c2440f]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Supprimer"
                          onClick={() => deletePayment.mutate(p.id, { onSuccess: refreshStudentPayments })}
                          className="p-1.5 rounded hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <PaymentFormDialog editing={editing} onClose={() => { setEditing(null); refreshStudentPayments() }} />
      </DialogContent>
    </Dialog>
  )
}
