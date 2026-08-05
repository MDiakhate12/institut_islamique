import * as XLSX from 'xlsx'
import type { PaymentListItem } from '@/modules/payments/payments.types'
import { PAYMENT_CATEGORY_LABELS, PAYMENT_PERIOD_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/modules/payments/payments.labels'

export function exportPaymentsToExcel(payments: PaymentListItem[]) {
  const rows = payments.map(p => ({
    'Date': p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '',
    'Nom du parent': p.parentName ?? '',
    'Étudiant': p.studentName,
    'Catégorie': PAYMENT_CATEGORY_LABELS[p.category] ?? p.category,
    'Période': PAYMENT_PERIOD_LABELS[p.period] ?? p.period,
    'Méthode': PAYMENT_METHOD_LABELS[p.method] ?? p.method,
    'Option financière': p.financialOption ?? '',
    'Montant (€)': (p.amount / 100).toFixed(2),
    'Statut': PAYMENT_STATUS_LABELS[p.status] ?? p.status,
    'Soumis par': p.submittedByLabel,
    'Notes': p.notes ?? '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Budget')
  XLSX.writeFile(wb, `budget-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
