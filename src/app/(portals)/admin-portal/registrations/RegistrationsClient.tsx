'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRegistrations } from '@/modules/registrations/registrations.hooks'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardList, Pencil, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportRegistrationsToExcel } from './registrations.excel'
import type { RegistrationWithDetails } from '@/modules/registrations/registrations.types'

type TypeFilter = 'all' | 'new_student' | 'reenrollment'
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

export function RegistrationsClient() {
  const { data: registrations, isLoading } = useRegistrations()

  const [search, setSearch]           = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [typeFilter, setTypeFilter]   = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const grades = useMemo(() => {
    const set = new Set((registrations ?? []).map(r => r.grade).filter((g): g is string => !!g))
    return Array.from(set).sort()
  }, [registrations])

  const filtered = useMemo(() => {
    if (!registrations) return []
    return registrations.filter(r => {
      if (gradeFilter !== 'all' && r.grade !== gradeFilter) return false
      if (typeFilter !== 'all' && r.formType !== typeFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const name = `${r.studentFirstName ?? ''} ${r.studentLastName ?? ''}`.toLowerCase()
        return name.includes(q) || (r.studentCustomId ?? '').toLowerCase().includes(q)
      }
      return true
    })
  }, [registrations, search, gradeFilter, typeFilter, statusFilter])

  const total = registrations?.length ?? 0

  return (
    <div className="p-6 space-y-4">
      {/* ── En-tête ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inscriptions des élèves</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Afficher et gérer toutes les inscriptions des élèves</p>
          {!isLoading && <p className="text-xs text-muted-foreground mt-1">{total} inscription{total !== 1 ? 's' : ''}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin-portal/registration-forms"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#c2440f] hover:bg-[#a33a0d] text-white rounded-md transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Modifier les formulaires d&apos;inscription
          </Link>
          <button
            onClick={() => registrations && exportRegistrationsToExcel(registrations)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-green-600 text-green-700 hover:bg-green-50 rounded-md transition-colors"
          >
            <Download className="h-4 w-4" />
            Télécharger en Excel
          </button>
        </div>
      </div>

      {/* ── Recherche + filtres ── */}
      <div className="flex items-center flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Rechercher par nom ou ID étudiant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30 focus:border-[#c2440f]/50"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none cursor-pointer"
        >
          <option value="all">Tous les niveaux</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as TypeFilter)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none cursor-pointer"
        >
          <option value="all">Tous les types</option>
          <option value="new_student">Nouvel élève</option>
          <option value="reenrollment">Réinscription</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none cursor-pointer"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvé</option>
          <option value="rejected">Rejeté</option>
        </select>
      </div>

      {/* ── Tableau ── */}
      {isLoading ? <RegistrationsSkeleton /> : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search ? 'Aucune inscription trouvée' : 'Aucune inscription pour le moment'}
          description={search ? 'Essayez un autre terme.' : 'Les inscriptions soumises par les parents apparaîtront ici.'}
        />
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-3 py-3 text-left">ID</th>
                  <th className="px-3 py-3 text-left">Élève</th>
                  <th className="px-3 py-3 text-left">Soumis le</th>
                  <th className="px-3 py-3 text-left min-w-[160px]">Parents</th>
                  <th className="px-3 py-3 text-left min-w-[180px]">Contact</th>
                  <th className="px-3 py-3 text-left">Niveau</th>
                  <th className="px-3 py-3 text-left min-w-[160px]">Classes</th>
                  <th className="px-3 py-3 text-left">Paiement</th>
                  <th className="px-3 py-3 text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => <RegistrationRow key={r.id} registration={r} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function RegistrationRow({ registration: r }: { registration: RegistrationWithDetails }) {
  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
      <td className="px-3 py-3 text-xs text-muted-foreground">{r.studentCustomId ?? '—'}</td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{r.studentFirstName} {r.studentLastName}</span>
          {r.formType === 'new_student' && (
            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
              NEW
            </span>
          )}
        </div>
      </td>

      <td className="px-3 py-3 text-xs text-muted-foreground">
        {new Date(r.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>

      <td className="px-3 py-3">
        {r.parents.length === 0 ? (
          <span className="text-muted-foreground text-xs italic">—</span>
        ) : (
          <div className="space-y-0.5">
            {r.parents.map((p, i) => (
              <p key={i} className="font-medium text-xs">{p.name}</p>
            ))}
          </div>
        )}
      </td>

      <td className="px-3 py-3">
        {r.parents.length === 0 ? (
          <span className="text-muted-foreground text-xs italic">—</span>
        ) : (
          <div className="space-y-0.5">
            {r.parents.map((p, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                {p.email && <p>{p.email}</p>}
                {p.phone && <p>{p.phone}</p>}
              </div>
            ))}
          </div>
        )}
      </td>

      <td className="px-3 py-3 text-xs">{r.grade ?? '—'}</td>

      <td className="px-3 py-3">
        {r.classes.length === 0 ? (
          <span className="text-muted-foreground text-xs italic">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {r.classes.map(c => (
              <span
                key={c.fullCode}
                className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#7a4f30] text-white"
              >
                {c.fullCode}
              </span>
            ))}
          </div>
        )}
      </td>

      <td className="px-3 py-3 text-xs">
        {r.paymentFrequency ?? '—'}
        {r.financialAid && r.financialAid !== 'No, thank you!' && (
          <p className="text-[11px] text-emerald-700 mt-0.5">{r.financialAid}</p>
        )}
      </td>

      <td className="px-3 py-3">
        <StatusBadge status={r.status === 'approved' ? 'verified' : r.status} />
      </td>
    </tr>
  )
}

function RegistrationsSkeleton() {
  return (
    <div className={cn('rounded-lg border border-border bg-white overflow-hidden')}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {Array.from({ length: 9 }).map((_, i) => (
                <th key={i} className="px-3 py-3"><Skeleton className="h-3 w-20" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} className="px-3 py-3"><Skeleton className="h-4 w-full" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
