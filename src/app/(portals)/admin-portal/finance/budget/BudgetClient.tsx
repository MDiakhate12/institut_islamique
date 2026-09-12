'use client'

import { useMemo, useState } from 'react'
import { Search, ArrowUpDown, Pencil, Trash2, Check, X, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { cn } from '@/lib/utils'
import {
  usePayments, usePaymentKpis, useVerifyPayment, useRejectPayment, useDeletePayment,
} from '@/modules/payments/payments.hooks'
import { useExpenseKpis } from '@/modules/expenses/expenses.hooks'
import { useWageKpis } from '@/modules/wages/wages.hooks'
import type { PaymentListItem } from '@/modules/payments/payments.types'
import {
  PAYMENT_CATEGORY_LABELS, PAYMENT_PERIOD_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS,
} from '@/modules/payments/payments.labels'
import { PaymentFormDialog } from './PaymentFormDialog'
import { PaymentReminderDialog } from './PaymentReminderDialog'
import { exportPaymentsToExcel } from './budget.excel'

const METHOD_CHIPS = ['venmo', 'cash', 'check', 'paypal', 'no_fees']
const PERIOD_CHIPS = ['trimester_1', 'trimester_2', 'trimester_3', 'annually']
const STATUS_CHIPS = ['pending', 'verified', 'rejected']

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
        active ? 'bg-[#7a4f30] text-white border-[#7a4f30]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
      )}
    >
      {children}
    </button>
  )
}

function KpiCard({ label, value, className, valueClassName }: { label: string; value: string; className: string; valueClassName?: string }) {
  return (
    <div className={cn('rounded-xl p-5 flex-1 min-w-[200px]', className)}>
      <p className="text-sm opacity-90">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', valueClassName)}>{value}</p>
    </div>
  )
}

type SortKey = 'date' | 'parentName' | 'studentName' | 'amount' | 'status'

function SortTh({ label, sortKey, active, asc, onSort }: {
  label: string; sortKey: SortKey; active: boolean; asc: boolean; onSort: (k: SortKey) => void
}) {
  return (
    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
      <button type="button" onClick={() => onSort(sortKey)} className="flex items-center gap-1 hover:text-gray-800">
        {label}
        <ArrowUpDown className={cn('h-3 w-3', active && 'text-[#c2440f]')} />
      </button>
    </th>
  )
}

export function BudgetClient() {
  const { data: payments = [], isLoading } = usePayments()
  const { data: paymentKpis } = usePaymentKpis()
  const { data: expenseKpis } = useExpenseKpis()
  const { data: wageKpis } = useWageKpis()
  const verifyPayment = useVerifyPayment()
  const rejectPayment = useRejectPayment()
  const deletePayment = useDeletePayment()

  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<string | null>(null)
  const [periodFilter, setPeriodFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [editing, setEditing] = useState<PaymentListItem | null>(null)

  const filtered = useMemo(() => {
    return payments.filter(p => {
      if (methodFilter && p.method !== methodFilter) return false
      if (periodFilter && p.period !== periodFilter) return false
      if (statusFilter && p.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!p.parentName?.toLowerCase().includes(q) && !p.studentName.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [payments, methodFilter, periodFilter, statusFilter, search])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = (a.date ?? '').localeCompare(b.date ?? '')
      else if (sortKey === 'amount') cmp = a.amount - b.amount
      else if (sortKey === 'parentName') cmp = (a.parentName ?? '').localeCompare(b.parentName ?? '')
      else if (sortKey === 'studentName') cmp = a.studentName.localeCompare(b.studentName)
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [filtered, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const total = filtered.reduce((s, p) => s + p.amount, 0)
  const dépensesPayées = (expenseKpis?.paid ?? 0) + (wageKpis?.paid ?? 0)
  const budgetRestant = (paymentKpis?.totalRevenue ?? 0) - dépensesPayées

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Budget" subtitle="Gérer et suivre tous les paiements" />

      <div className="flex flex-wrap gap-4">
        <KpiCard label="Budget Total (Revenus)" value={formatAmount(paymentKpis?.totalRevenue ?? 0)} className="bg-[#d4a373] text-white" />
        {(paymentKpis?.pendingVerification ?? 0) > 0 && (
          <KpiCard label="(En attente de vérification)" value={formatAmount(paymentKpis!.pendingVerification)} className="bg-blue-500 text-white" />
        )}
        <KpiCard label="Dépenses payées" value={formatAmount(dépensesPayées)} className="bg-[#5c3820] text-white" />
        <KpiCard
          label="Budget restant"
          value={formatAmount(budgetRestant)}
          className="bg-[#2d5a2d] text-white"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <PaymentFormDialog editing={editing} onClose={() => setEditing(null)} />
        <PaymentReminderDialog />
        <Button
          variant="outline"
          className="border-green-600 text-green-700 hover:bg-green-50 gap-1.5 flex-1"
          onClick={() => exportPaymentsToExcel(sorted)}
        >
          <Download className="h-4 w-4" /> Télécharger en Excel
        </Button>
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Rechercher noms des parents, étudiants..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {METHOD_CHIPS.map(m => (
            <Chip key={m} active={methodFilter === m} onClick={() => setMethodFilter(methodFilter === m ? null : m)}>
              {PAYMENT_METHOD_LABELS[m]}
            </Chip>
          ))}
          {PERIOD_CHIPS.map(p => (
            <Chip key={p} active={periodFilter === p} onClick={() => setPeriodFilter(periodFilter === p ? null : p)}>
              {PAYMENT_PERIOD_LABELS[p]}
            </Chip>
          ))}
          {STATUS_CHIPS.map(s => (
            <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? null : s)}>
              {PAYMENT_STATUS_LABELS[s]}
            </Chip>
          ))}
          <span className="text-xs text-gray-500 ml-auto whitespace-nowrap">{sorted.length} résultat{sorted.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8 text-sm">Chargement...</p>
          ) : sorted.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">Aucun paiement trouvé</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <SortTh label="Date" sortKey="date" active={sortKey === 'date'} asc={sortAsc} onSort={toggleSort} />
                  <SortTh label="Nom du parent" sortKey="parentName" active={sortKey === 'parentName'} asc={sortAsc} onSort={toggleSort} />
                  <SortTh label="Étudiants" sortKey="studentName" active={sortKey === 'studentName'} asc={sortAsc} onSort={toggleSort} />
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Catégorie</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Période</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Méthode</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Option financière</th>
                  <SortTh label="Montant" sortKey="amount" active={sortKey === 'amount'} asc={sortAsc} onSort={toggleSort} />
                  <SortTh label="Statut" sortKey="status" active={sortKey === 'status'} asc={sortAsc} onSort={toggleSort} />
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Soumis par</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map(p => (
                  <tr key={p.id} className={cn(p.source === 'parent' && p.status === 'pending' && 'bg-red-50/40')}>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {p.date ? new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                      {p.source === 'parent' && p.status === 'pending' && (
                        <p className="text-xs text-orange-600">En attente de vérification</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{p.parentName ?? '—'}</td>
                    <td className="px-3 py-2.5">{p.studentName}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                        {PAYMENT_CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {PAYMENT_PERIOD_LABELS[p.period] ?? p.period}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                        {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{p.financialOption ?? '—'}</td>
                    <td className="px-3 py-2.5 font-medium">{formatAmount(p.amount)}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={p.status as 'verified' | 'pending' | 'rejected'} />
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      {p.submittedByLabel}
                      {p.source === 'parent' && p.status === 'pending' && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600 whitespace-nowrap">
                          Réclamation parent
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 max-w-[140px] truncate">
                      {p.source === 'parent' ? 'Soumis par le parent' : (p.notes ?? '—')}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.source === 'parent' && p.status === 'pending' ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Vérifier le paiement"
                            onClick={() => verifyPayment.mutate(p.id)}
                            className="p-1.5 rounded hover:bg-green-100 text-green-600"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Rejeter le paiement"
                            onClick={() => rejectPayment.mutate(p.id)}
                            className="p-1.5 rounded hover:bg-red-100 text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(p)}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-gray-100 text-[#c2440f] text-xs font-medium"
                          >
                            <Pencil className="h-4 w-4" />
                            Modifier
                          </button>
                          <button
                            type="button"
                            title="Supprimer"
                            onClick={() => deletePayment.mutate(p.id)}
                            className="p-1.5 rounded hover:bg-red-100 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[#c2440f]">
                <tr>
                  <td colSpan={7} className="px-3 py-3 font-semibold">Total</td>
                  <td className="px-3 py-3 font-bold text-[#c2440f]">{formatAmount(total)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
