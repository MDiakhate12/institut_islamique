'use client'

import { useState } from 'react'
import { Search, Download, CheckCircle2, Clock, DollarSign, FileText, CreditCard } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { ExpenseFormDialog } from '@/components/shared/ExpenseFormDialog/ExpenseFormDialog'
import { cn } from '@/lib/utils'
import { EXPENSE_CATEGORY_LABELS } from '@/lib/constants'
import type { ExpenseCategory } from '@/lib/constants'
import { useMyExpenses, useMyExpenseKpis } from '@/modules/expenses/expenses.hooks'
import { useMyWages, useMyWageKpis } from '@/modules/wages/wages.hooks'
import { LogMyHoursDialog } from './LogMyHoursDialog'

type Tab = 'reimbursements' | 'wages'

function formatEur(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: 'green' | 'orange' | 'blue' }) {
  const colorMap = {
    green: { border: 'border-green-500', bg: 'bg-green-50', icon: 'text-green-600' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-50', icon: 'text-orange-600' },
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', icon: 'text-blue-600' },
  }[color]
  return (
    <div className={cn('flex-1 min-w-[200px] rounded-xl border-2 bg-white p-4 flex items-center justify-between', colorMap.border)}>
      <div>
        <p className="text-xs uppercase font-semibold text-gray-500">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', colorMap.bg, colorMap.icon)}>
        {icon}
      </div>
    </div>
  )
}

const STATUS_OPTIONS = [
  { value: '__all__', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvé' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'paid', label: 'Payé' },
]

export function RefundsClient() {
  const [tab, setTab] = useState<Tab>('reimbursements')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('__all__')

  const { data: expenses = [] } = useMyExpenses()
  const { data: expenseKpis } = useMyExpenseKpis()
  const { data: timesheet } = useMyWages()
  const { data: wageKpis } = useMyWageKpis()

  const filteredExpenses = expenses.filter(e => {
    if (statusFilter !== '__all__' && e.status !== statusFilter) return false
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const kpis = tab === 'wages'
    ? { approved: wageKpis?.approved ?? 0, pending: wageKpis?.pending ?? 0, paid: wageKpis?.paid ?? 0 }
    : { approved: expenseKpis?.approved ?? 0, pending: expenseKpis?.pending ?? 0, paid: expenseKpis?.paid ?? 0 }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Mes remboursements"
        subtitle="Suivez vos demandes de remboursement de dépenses"
        actions={<ExpenseFormDialog triggerLabel="Nouveau remboursement" />}
      />

      <div className="flex flex-wrap gap-4">
        <KpiCard label="Approuvé" value={formatEur(kpis.approved)} icon={<CheckCircle2 className="h-5 w-5" />} color="green" />
        <KpiCard label="En attente" value={formatEur(kpis.pending)} icon={<Clock className="h-5 w-5" />} color="orange" />
        <KpiCard label="Payé" value={formatEur(kpis.paid)} icon={<DollarSign className="h-5 w-5" />} color="blue" />
      </div>

      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setTab('reimbursements')}
          className={cn('flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px',
            tab === 'reimbursements' ? 'border-[#c2440f] text-[#c2440f]' : 'border-transparent text-gray-500 hover:text-gray-700')}
        >
          <FileText className="h-4 w-4" /> Remboursements ({expenses.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('wages')}
          className={cn('flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px',
            tab === 'wages' ? 'border-[#c2440f] text-[#c2440f]' : 'border-transparent text-gray-500 hover:text-gray-700')}
        >
          <CreditCard className="h-4 w-4" /> Salaires
        </button>
      </div>

      {tab === 'reimbursements' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Rechercher description..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={v => v && setStatusFilter(v)}>
              <SelectTrigger className="w-48">
                <SelectValue>{(v: string) => STATUS_OPTIONS.find(o => o.value === v)?.label ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredExpenses.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm bg-white rounded-xl border">Aucune demande de dépense ne correspond à vos filtres.</p>
          ) : (
            filteredExpenses.map(e => (
              <div key={e.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={e.status as 'pending' | 'approved' | 'paid' | 'rejected'} />
                    <span className="text-sm text-muted-foreground">
                      {new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  <span className="font-bold text-lg">{formatEur(e.amount)}</span>
                </div>
                <div className="flex gap-8">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Description</p>
                    <p className="text-sm">{e.description}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Catégorie</p>
                    <p className="text-sm">{e.category ? (EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] ?? e.category) : '—'}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'wages' && (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <div className="p-3 flex justify-end border-b">
            <LogMyHoursDialog />
          </div>
          {!timesheet || timesheet.sessionCount === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">Aucun enregistrement de salaire trouvé.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-y bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Classe</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Heures</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Statut</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {timesheet.dates.flatMap(d =>
                  (timesheet.rows[0]?.entriesByDate[d] ?? []).map(entry => (
                    <tr key={entry.id}>
                      <td className="px-3 py-2.5">{new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</td>
                      <td className="px-3 py-2.5">{entry.className ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center">{entry.hoursWorked}h</td>
                      <td className="px-3 py-2.5"><StatusBadge status={entry.status as 'pending' | 'approved' | 'paid' | 'rejected'} /></td>
                      <td className="px-3 py-2.5 text-right font-medium">{formatEur(entry.amountCents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t-2 bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-3 py-3 font-semibold">Total</td>
                  <td className="px-3 py-3 text-center font-semibold">{timesheet.totalHours}h</td>
                  <td />
                  <td className="px-3 py-3 text-right font-bold">{formatEur(timesheet.totalAmountCents)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
