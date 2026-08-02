'use client'

import { useState } from 'react'
import { Search, Download, CheckCircle2, Clock, DollarSign, FileText, CreditCard, Wallet } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { cn } from '@/lib/utils'
import { EXPENSE_CATEGORY_LABELS } from '@/lib/constants'
import type { ExpenseCategory } from '@/lib/constants'
import {
  useExpenses, useExpenseKpis, useApproveExpense, useRejectExpense, useMarkExpensePaid,
} from '@/modules/expenses/expenses.hooks'
import { useWageTimesheet, useWageKpis } from '@/modules/wages/wages.hooks'
import type { WageEntry } from '@/modules/wages/wages.types'
import { ExpenseFormDialog } from '@/components/shared/ExpenseFormDialog/ExpenseFormDialog'
import { WageFormDialog } from './WageFormDialog'
import { EditWageRecordDialog } from './EditWageRecordDialog'
import { exportExpensesToExcel } from './expenses.excel'

type Tab = 'reimbursements' | 'wages' | 'payments'

function formatEur(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function KpiCard({ label, value, icon, color, active, onClick }: {
  label: string; value: string; icon: React.ReactNode; color: 'green' | 'orange' | 'blue'; active?: boolean; onClick?: () => void
}) {
  const colorMap = {
    green: { border: 'border-green-500', bg: 'bg-green-50', icon: 'text-green-600' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-50', icon: 'text-orange-600' },
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', icon: 'text-blue-600' },
  }[color]
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 min-w-[200px] rounded-xl border-2 bg-white p-4 flex items-center justify-between text-left transition-shadow',
        colorMap.border,
        onClick && 'cursor-pointer hover:shadow-md',
        active && colorMap.bg
      )}
    >
      <div>
        <p className="text-xs uppercase font-semibold text-gray-500">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', colorMap.bg, colorMap.icon)}>
        {icon}
      </div>
    </button>
  )
}

const STATUS_OPTIONS = [
  { value: '__all__', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvé' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'paid', label: 'Payé' },
]

export function ExpensesClient() {
  const [tab, setTab] = useState<Tab>('reimbursements')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('__all__')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [editingWage, setEditingWage] = useState<WageEntry | null>(null)

  const { data: expenses = [] } = useExpenses()
  const { data: expenseKpis } = useExpenseKpis()
  const approveExpense = useApproveExpense()
  const rejectExpense = useRejectExpense()
  const markPaid = useMarkExpensePaid()

  const { data: timesheet } = useWageTimesheet()
  const { data: wageKpis } = useWageKpis()

  const filteredExpenses = expenses.filter(e => {
    if (statusFilter !== '__all__' && e.status !== statusFilter) return false
    if (search && !e.description.toLowerCase().includes(search.toLowerCase()) && !e.submittedByName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const kpis = tab === 'wages'
    ? { approved: wageKpis?.approved ?? 0, pending: wageKpis?.pending ?? 0, paid: wageKpis?.paid ?? 0 }
    : { approved: expenseKpis?.approved ?? 0, pending: expenseKpis?.pending ?? 0, paid: expenseKpis?.paid ?? 0 }

  const filteredTimesheetRows = (timesheet?.rows ?? [])
    .map(row => {
      const entriesByDate = Object.fromEntries(
        Object.entries(row.entriesByDate)
          .map(([date, entries]) => [
            date,
            statusFilter === '__all__' ? entries : entries.filter(en => en.status === statusFilter),
          ])
          .filter(([, entries]) => (entries as typeof row.entriesByDate[string]).length > 0)
      ) as typeof row.entriesByDate
      const remaining = Object.values(entriesByDate).flat()
      return {
        ...row,
        entriesByDate,
        totalHours: remaining.reduce((s, en) => s + en.hoursWorked, 0),
        totalAmountCents: remaining.reduce((s, en) => s + en.amountCents, 0),
      }
    })
    .filter(row => Object.keys(row.entriesByDate).length > 0)

  const filteredTimesheetTotalHours = filteredTimesheetRows.reduce((s, r) => s + r.totalHours, 0)
  const filteredTimesheetTotalAmount = filteredTimesheetRows.reduce((s, r) => s + r.totalAmountCents, 0)

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dépenses"
        subtitle="Suivre et gérer les remboursements de dépenses"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-green-600 text-green-700 hover:bg-green-50 gap-1.5"
              onClick={() => exportExpensesToExcel(filteredExpenses)}
            >
              <Download className="h-4 w-4" /> Télécharger en Excel
            </Button>
            <ExpenseFormDialog teacherSelectable />
          </div>
        }
      />

      <div className="flex flex-wrap gap-4">
        <KpiCard
          label="Approuvé" value={formatEur(kpis.approved)} icon={<CheckCircle2 className="h-5 w-5" />} color="green"
          active={statusFilter === 'approved'}
          onClick={() => setStatusFilter(statusFilter === 'approved' ? '__all__' : 'approved')}
        />
        <KpiCard
          label="En attente" value={formatEur(kpis.pending)} icon={<Clock className="h-5 w-5" />} color="orange"
          active={statusFilter === 'pending'}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? '__all__' : 'pending')}
        />
        <KpiCard
          label="Payé" value={formatEur(kpis.paid)} icon={<DollarSign className="h-5 w-5" />} color="blue"
          active={statusFilter === 'paid'}
          onClick={() => setStatusFilter(statusFilter === 'paid' ? '__all__' : 'paid')}
        />
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
          <CreditCard className="h-4 w-4" /> Salaires{timesheet && ` — ${timesheet.teacherCount} enseignant(s), ${timesheet.sessionCount} séance(s)`}
        </button>
        <button
          type="button"
          onClick={() => setTab('payments')}
          className={cn('flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px',
            tab === 'payments' ? 'border-[#c2440f] text-[#c2440f]' : 'border-transparent text-gray-500 hover:text-gray-700')}
        >
          <Wallet className="h-4 w-4" /> Paiements <span className="text-purple-500 text-xs">Bêta</span>
        </button>
      </div>

      {tab === 'reimbursements' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Rechercher description ou soumetteur..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Description</p>
                    <p className="text-sm">{e.description}</p>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Catégorie</p>
                      <p className="text-sm">{e.category ? (EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] ?? e.category) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Soumis par</p>
                      <p className="text-sm">{e.submittedByName}</p>
                    </div>
                  </div>
                </div>
                {e.status !== 'paid' && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <span className="text-xs text-gray-500">Actions rapides :</span>
                    {e.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="border-green-600 text-green-700 hover:bg-green-50 gap-1.5" onClick={() => approveExpense.mutate(e.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approuver
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-600 text-red-700 hover:bg-red-50 gap-1.5" onClick={() => setRejectingId(e.id)}>
                          Rejeter
                        </Button>
                      </>
                    )}
                    {e.status === 'approved' && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={() => markPaid.mutate(e.id)}>
                        <DollarSign className="h-3.5 w-3.5" /> Marquer comme payé
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'wages' && (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <div className="flex justify-end p-3 border-b text-xs text-gray-500 gap-4">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Payé</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Approuvé</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> En attente</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Rejeté</span>
          </div>
          <div className="p-3 flex justify-end">
            <WageFormDialog />
          </div>
          {!timesheet || filteredTimesheetRows.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              {statusFilter === '__all__' ? 'Aucun enregistrement de salaire trouvé.' : 'Aucun enregistrement ne correspond à ce statut.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-y bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Enseignant</th>
                  {timesheet.dates.map(d => (
                    <th key={d} className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                      {new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Heures</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTimesheetRows.map(row => (
                  <tr key={row.teacherId}>
                    <td className="px-3 py-3 flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-[#7a4f30] text-white text-xs flex items-center justify-center">
                        {row.teacherName.charAt(0).toUpperCase()}
                      </span>
                      {row.teacherName}
                    </td>
                    {timesheet.dates.map(d => {
                      const dayEntries = row.entriesByDate[d] ?? []
                      return (
                        <td key={d} className="px-3 py-3 text-center">
                          <div className="flex flex-col gap-1 items-center">
                            {dayEntries.map(entry => (
                              <button
                                key={entry.id}
                                type="button"
                                onClick={() => setEditingWage(entry)}
                                className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                                  entry.status === 'paid' && 'bg-green-100 text-green-700',
                                  entry.status === 'approved' && 'bg-blue-100 text-blue-700',
                                  entry.status === 'pending' && 'bg-orange-100 text-orange-700',
                                  entry.status === 'rejected' && 'bg-red-100 text-red-700')}
                              >
                                {entry.hoursWorked}h
                              </button>
                            ))}
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 text-center">{row.totalHours}h</td>
                    <td className="px-3 py-3 text-right font-medium">{formatEur(row.totalAmountCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 bg-gray-50">
                <tr>
                  <td className="px-3 py-3 font-semibold">Total</td>
                  <td colSpan={timesheet.dates.length} />
                  <td className="px-3 py-3 text-center font-semibold">{filteredTimesheetTotalHours}h</td>
                  <td className="px-3 py-3 text-right font-bold">{formatEur(filteredTimesheetTotalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-start gap-4 rounded-lg bg-gray-50 p-4">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="font-medium">No Payment Account Connected</p>
              <p className="text-sm text-muted-foreground">Connect Stripe to accept digital payments from parents (tuition, fees, donations).</p>
            </div>
          </div>
          <Button disabled className="mt-4 bg-indigo-600 text-white gap-2 opacity-60 cursor-not-allowed">
            <CreditCard className="h-4 w-4" /> Connect Stripe
          </Button>
        </div>
      )}

      <Dialog open={!!rejectingId} onOpenChange={v => { if (!v) setRejectingId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir REJETER cette demande ?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRejectingId(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (rejectingId) rejectExpense.mutate(rejectingId); setRejectingId(null) }}
            >
              Rejeter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EditWageRecordDialog entry={editingWage} onClose={() => setEditingWage(null)} />
    </div>
  )
}
