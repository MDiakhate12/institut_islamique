import * as XLSX from 'xlsx'
import type { ExpenseListItem } from '@/modules/expenses/expenses.types'
import { EXPENSE_CATEGORY_LABELS } from '@/lib/constants'
import type { ExpenseCategory } from '@/lib/constants'

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', approved: 'Approuvé', paid: 'Payé', rejected: 'Rejeté',
}

export function exportExpensesToExcel(expenses: ExpenseListItem[]) {
  const rows = expenses.map(e => ({
    'Date': new Date(e.date).toLocaleDateString('fr-FR'),
    'Description': e.description,
    'Catégorie': e.category ? (EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] ?? e.category) : '',
    'Montant (€)': (e.amount / 100).toFixed(2),
    'Statut': STATUS_LABELS[e.status] ?? e.status,
    'Soumis par': e.submittedByName,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Depenses')
  XLSX.writeFile(wb, `depenses-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
