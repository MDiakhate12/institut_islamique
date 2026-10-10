'use client'

import { useState, useMemo } from 'react'
import { RegistrationsOpenToggle } from '@/components/shared/RegistrationsOpenToggle/RegistrationsOpenToggle'
import { PageLoader } from '@/components/shared/Loader/PageLoader'
import Link from 'next/link'
import { useRegistrations, useReviewRegistration, useBulkApproveRegistrations } from '@/modules/registrations/registrations.hooks'
import { useSchool } from '@/modules/school/school.hooks'
import { useStudents } from '@/modules/students/students.hooks'
import { StudentFormDialog } from '../students/StudentForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { ClipboardList, Pencil, Download, X, Trash2, ArrowUpDown, Check, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportRegistrationsToExcel } from './registrations.excel'
import type { RegistrationWithDetails, RegistrationStatus } from '@/modules/registrations/registrations.types'

type TypeFilter = 'all' | 'new_student' | 'reenrollment'
type StatusFilter = 'all' | RegistrationStatus

const STATUS_META: Record<RegistrationStatus, { label: string; cls: string }> = {
  pending:  { label: 'En attente', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  approved: { label: 'Approuvée',  cls: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Rejetée',    cls: 'bg-red-100 text-red-700 border-red-200' },
}

function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  const m = STATUS_META[status]
  return <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border', m.cls)}>{m.label}</span>
}

function ConsentBadge({ value, label }: { value: boolean | null; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn(
        'inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold',
        value === true  ? 'bg-green-100 text-green-700' :
        value === false ? 'bg-red-50 text-red-600' :
        'bg-gray-100 text-gray-400'
      )}>
        {value === true ? 'Yes' : value === false ? 'No' : '—'}
      </span>
    </div>
  )
}

function ClassBadge({ code }: { code: string }) {
  const colorMap: Record<string, string> = {
    QRN: 'bg-green-100 text-green-700 border-green-200',
    ARA: 'bg-blue-100 text-blue-700 border-blue-200',
    ISL: 'bg-purple-100 text-purple-700 border-purple-200',
    NUR: 'bg-orange-100 text-orange-700 border-orange-200',
  }
  const subject = code.split('-')[0] ?? ''
  const cls = colorMap[subject] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border', cls)}>
      {code}
    </span>
  )
}

export function RegistrationsClient() {
  const { data: registrations, isLoading } = useRegistrations()

  const [search, setSearch]         = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  // On garde l'id (pas l'objet) : après une décision, le panneau relit la ligne rafraîchie
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = registrations?.find(r => r.id === selectedId) ?? null
  // Une inscription liée à un élève s'ouvre dans le même panneau que le tableau Élèves ;
  // sans élève (anciennes réinscriptions anonymes), repli sur le panneau de détail
  const { data: students, isLoading: loadingStudents } = useStudents()
  const { isLoading: loadingSchool } = useSchool()
  const selectedStudent = selected?.studentId ? students?.find(s => s.id === selected.studentId) ?? null : null
  // Repli seulement quand on sait qu'il n'y a pas d'élève (évite un flash pendant le chargement des élèves)
  const showDetailPanel = !!selected && (!selected.studentId || (!!students && !selectedStudent))
  const pendingCount = (registrations ?? []).filter(r => r.status === 'pending').length
  // Approbation groupée : cases cochées (seules les inscriptions non approuvées sont cochables)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [confirmBulk, setConfirmBulk] = useState(false)
  const bulkApprove = useBulkApproveRegistrations()

  const grades = useMemo(() => {
    const set = new Set((registrations ?? []).map(r => r.grade).filter((g): g is string => !!g))
    return Array.from(set).sort()
  }, [registrations])

  const years = useMemo(() => {
    const set = new Set<string>()
    ;(registrations ?? []).forEach(r => {
      const y = new Date(r.submittedAt).getFullYear()
      set.add(`${y}-${y + 1}`)
    })
    return Array.from(set).sort().reverse()
  }, [registrations])

  const toggleChecked = (id: string) => setCheckedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
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

  // Cochables visibles = non approuvées du filtre courant ; les cases d'une ligne masquée ou
  // approuvée entre-temps ne comptent pas
  const checkable = filtered.filter(r => r.status !== 'approved')
  const checkedVisible = checkable.filter(r => checkedIds.has(r.id))
  const allChecked = checkable.length > 0 && checkedVisible.length === checkable.length
  const runBulkApprove = () => bulkApprove.mutate(checkedVisible.map(r => r.id), {
    onSuccess: res => { if (res.success) { setCheckedIds(new Set()); setConfirmBulk(false) } },
  })

  const total = registrations?.length ?? 0

  // Detect custom field columns from the first registration
  const customFieldLabels = useMemo(() => {
    if (!registrations?.length) return []
    const labels = new Set<string>()
    registrations.forEach(r => r.customFields?.forEach(cf => labels.add(cf.label)))
    return Array.from(labels)
  }, [registrations])

  if (isLoading || loadingStudents || loadingSchool) return <PageLoader />

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#2d6a4f' }}>Inscriptions des élèves</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Afficher et gérer toutes les inscriptions des élèves</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin-portal/registration-forms"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#2d6a4f] hover:bg-[#1b4332] text-white rounded-md transition-colors"
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

      <RegistrationsOpenToggle />

      {/* ── Recherche + filtres ── */}
      <div className="flex items-center flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Rechercher par nom ou ID étudiant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2d6a4f]/30"
          />
        </div>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none cursor-pointer min-w-[140px]">
          <option value="all">Tous les niveaux</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TypeFilter)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none cursor-pointer min-w-[150px]">
          <option value="all">Tous les types de...</option>
          <option value="new_student">Nouvel élève</option>
          <option value="reenrollment">Réinscription</option>
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none cursor-pointer min-w-[120px]">
          <option value="all">All Types</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {total}
        </span>
      </div>

      {/* ── Filtre par statut ── */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(s => {
          const count = s === 'all' ? total : (registrations ?? []).filter(r => r.status === s).length
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                statusFilter === s ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'bg-white text-muted-foreground border-border hover:border-[#2d6a4f]/40',
              )}
            >
              {s === 'all' ? 'Toutes' : STATUS_META[s].label} ({count})
            </button>
          )
        })}
        {pendingCount > 0 && (
          <span className="text-xs text-orange-700">{pendingCount} inscription{pendingCount > 1 ? 's' : ''} à traiter</span>
        )}
      </div>

      <Dialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approuver {checkedVisible.length} inscription{checkedVisible.length > 1 ? 's' : ''} ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Les élèves concernés entreront dans le tableau Élèves et chaque famille sera prévenue
            (notification et e-mail). Une approbation est définitive.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmBulk(false)} disabled={bulkApprove.isPending}>Annuler</Button>
            <Button onClick={runBulkApprove} disabled={bulkApprove.isPending}
              className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white">
              {bulkApprove.isPending ? 'Approbation…' : 'Approuver'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Tableau + panneau détail ── */}
      <div className="flex flex-col lg:flex-row gap-4 relative">
        <div className={cn('flex-1 min-w-0 rounded-lg border border-border bg-white overflow-hidden', showDetailPanel && 'lg:max-w-[calc(100%-380px)]')}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={search ? 'Aucune inscription trouvée' : 'Aucune inscription pour le moment'}
              description={search ? 'Essayez un autre terme.' : 'Les inscriptions soumises par les parents apparaîtront ici.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="pl-3 py-3 w-8">
                      <SelectBox
                        label="Sélectionner toutes les inscriptions non approuvées"
                        checked={allChecked}
                        disabled={checkable.length === 0}
                        onToggle={() => setCheckedIds(allChecked ? new Set() : new Set(checkable.map(r => r.id)))}
                      />
                    </th>
                    <SortableTh label="ID" />
                    <SortableTh label="Élève" />
                    <th className="px-3 py-3 text-left">Statut</th>
                    <SortableTh label="Inscrit le" />
                    <th className="px-3 py-3 text-left">Parents</th>
                    <th className="px-3 py-3 text-left">Contact</th>
                    <SortableTh label="Naissance" />
                    <SortableTh label="Niveau" />
                    <th className="px-3 py-3 text-left">Anciennes classes</th>
                    <th className="px-3 py-3 text-left min-w-[160px]">Classes</th>
                    <SortableTh label="Frais" />
                    <th className="px-3 py-3 text-left">École</th>
                    <th className="px-3 py-3 text-left">Consentements</th>
                    {customFieldLabels.map(label => (
                      <th key={label} className="px-3 py-3 text-left max-w-[140px] truncate">{label}</th>
                    ))}
                    <th className="px-3 py-3 text-left w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <RegistrationRow
                      key={r.id}
                      registration={r}
                      customFieldLabels={customFieldLabels}
                      isSelected={selected?.id === r.id}
                      isChecked={checkedIds.has(r.id)}
                      onToggleChecked={() => toggleChecked(r.id)}
                      onClick={() => setSelectedId(prev => prev === r.id ? null : r.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Panneau détail (repli sans élève lié) ── */}
        {selected && showDetailPanel && (
          <RegistrationDetailPanel
            registration={selected}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* Panneau élève — le même que le tableau Élèves, avec la décision d'inscription en tête.
          Hors du tableau (§7.15) ; la clé inclut le statut pour que le formulaire reparte des
          valeurs à jour (élève activé) après une décision (§7.16). */}
      {selected && selectedStudent && (
        <StudentFormDialog
          key={`${selectedStudent.id}-${selected.status}`}
          student={selectedStudent}
          open={true}
          onOpenChange={v => { if (!v) setSelectedId(null) }}
          topSlot={<RegistrationSummary registration={selected} />}
        />
      )}

      {/* ── Barre flottante sélection (même forme que le tableau Élèves) ── */}
      {checkedVisible.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] text-white rounded-xl shadow-2xl">
          <span className="text-sm font-medium">
            {checkedVisible.length} inscription{checkedVisible.length > 1 ? 's' : ''} sélectionnée{checkedVisible.length > 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            onClick={() => setConfirmBulk(true)}
            className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white gap-1.5 h-8"
          >
            <Check className="h-3.5 w-3.5" />
            Approuver
          </Button>
          <button
            type="button"
            aria-label="Vider la sélection"
            onClick={() => setCheckedIds(new Set())}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

/** Case de sélection — même rendu que le tableau Élèves */
function SelectBox({ label, checked, disabled, onToggle }: {
  label: string
  checked: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        checked ? 'bg-[#2d6a4f] border-[#2d6a4f]' : 'border-border bg-white',
      )}
    >
      {checked && <Check className="h-2.5 w-2.5 text-white" />}
    </button>
  )
}

/** En-tête du panneau élève ouvert depuis Inscriptions : statut de l'inscription + décision */
function RegistrationSummary({ registration: r }: { registration: RegistrationWithDetails }) {
  return (
    <div className="space-y-2 pb-1">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Inscription {r.formType === 'new_student' ? 'nouvel élève' : 'réinscription'}</span>
        <span>·</span>
        <span>soumise le {new Date(r.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <RegistrationStatusBadge status={r.status} />
      </div>
      <ReviewSection registration={r} />
    </div>
  )
}

function SortableTh({ label }: { label: string }) {
  return (
    <th className="px-3 py-3 text-left">
      <button className="flex items-center gap-1 hover:text-foreground transition-colors">
        {label} <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  )
}

function RegistrationRow({
  registration: r,
  customFieldLabels,
  isSelected,
  isChecked,
  onToggleChecked,
  onClick,
}: {
  registration: RegistrationWithDetails
  customFieldLabels: string[]
  isSelected: boolean
  isChecked: boolean
  onToggleChecked: () => void
  onClick: () => void
}) {
  const father = r.parents[0]
  const mother = r.parents[1]

  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-border/50 last:border-0 cursor-pointer transition-colors',
        isSelected ? 'bg-orange-50' : isChecked ? 'bg-[#2d6a4f]/5' : 'hover:bg-muted/10'
      )}
    >
      {/* Sélection (approbation groupée) — le clic ne doit pas ouvrir le panneau */}
      <td className={cn('pl-3 py-2.5', isChecked && 'bg-[#2d6a4f]/5')} onClick={e => e.stopPropagation()}>
        {r.status !== 'approved' && (
          <SelectBox
            label={`Sélectionner ${r.studentFirstName} ${r.studentLastName}`}
            checked={isChecked}
            onToggle={onToggleChecked}
          />
        )}
      </td>

      {/* ID */}
      <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">
        {r.studentCustomId ?? '—'}
      </td>

      {/* Student */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="font-medium text-foreground">{r.studentFirstName} {r.studentLastName}</span>
          {r.formType === 'new_student' && (
            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase">NEW</span>
          )}
        </div>
      </td>

      {/* Statut */}
      <td className="px-3 py-2.5"><RegistrationStatusBadge status={r.status} /></td>

      {/* Registered At */}
      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        {new Date(r.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>

      {/* Parents */}
      <td className="px-3 py-2.5">
        <div className="space-y-0.5">
          {father && (
            <div className="flex items-center gap-1 text-xs">
              <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span>{father.name}</span>
            </div>
          )}
          {mother && (
            <div className="flex items-center gap-1 text-xs">
              <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span>{mother.name}</span>
            </div>
          )}
        </div>
      </td>

      {/* Contact */}
      <td className="px-3 py-2.5">
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {r.parents[0]?.email && (
            <div className="flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <span>{r.parents[0].email}</span>
            </div>
          )}
          {r.parents[0]?.phone && (
            <div className="flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              <span>{r.parents[0].phone}</span>
            </div>
          )}
        </div>
      </td>

      {/* DOB */}
      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        {r.studentBirthDate
          ? new Date(r.studentBirthDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—'}
      </td>

      {/* Grade */}
      <td className="px-3 py-2.5 text-xs">
        {r.grade ? <span className="text-[#2d6a4f] font-medium">{r.grade}</span> : <span className="text-muted-foreground">—</span>}
      </td>

      {/* Old Classes */}
      <td className="px-3 py-2.5 text-xs text-muted-foreground">—</td>

      {/* Classes */}
      <td className="px-3 py-2.5">
        {r.classes.length === 0 ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {r.classes.map(c => <ClassBadge key={c.fullCode} code={c.fullCode} />)}
          </div>
        )}
      </td>

      {/* Tuition */}
      <td className="px-3 py-2.5">
        <div className="text-xs">
          {r.paymentFrequency && <p className="font-medium">{r.paymentFrequency}</p>}
          {r.financialAid && r.financialAid !== 'No, thank you!' && (
            <p className="text-emerald-600">{r.financialAid}</p>
          )}
          {r.financialAid === 'No, thank you!' && (
            <p className="text-muted-foreground">No, thank you!</p>
          )}
        </div>
      </td>

      {/* Tenant (School / Year) */}
      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">Attawba</p>
          <p>{new Date(r.submittedAt).getFullYear()}-{new Date(r.submittedAt).getFullYear() + 1}</p>
        </div>
      </td>

      {/* Consents */}
      <td className="px-3 py-2.5">
        <div className="space-y-0.5">
          <ConsentBadge value={r.photoConsent} label="Photo" />
          <ConsentBadge value={r.policyConsent} label="Policy" />
        </div>
      </td>

      {/* Custom fields */}
      {customFieldLabels.map(label => {
        const cf = r.customFields?.find(f => f.label === label)
        return (
          <td key={label} className="px-3 py-2.5 text-xs text-muted-foreground max-w-[140px] truncate">
            {cf?.value ?? '—'}
          </td>
        )
      })}

      {/* Delete */}
      <td className="px-3 py-2.5">
        <button
          onClick={e => e.stopPropagation()}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

function RegistrationDetailPanel({
  registration: r,
  onClose,
}: {
  registration: RegistrationWithDetails
  onClose: () => void
}) {
  const father = r.parents[0]
  const mother = r.parents[1]
  const { data: school } = useSchool()
  const schoolName = school?.name ?? '—' // était « Attawba » en dur, quelle que soit l'école

  return (
    <div className="w-full lg:w-[340px] shrink-0 rounded-lg border border-border bg-white overflow-y-auto lg:max-h-[calc(100vh-200px)] lg:sticky lg:top-0">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <div>
          <h2 className="font-semibold text-foreground">{r.studentFirstName} {r.studentLastName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground font-mono">#{r.studentCustomId}</span>
            {r.formType === 'new_student' && (
              <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase">NEW</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Inscrit le {new Date(r.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <div className="mt-2"><RegistrationStatusBadge status={r.status} /></div>
        </div>
        <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-5 text-sm">

        <ReviewSection registration={r} />

        {/* Student Info */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Infos élève</h3>
          <div className="space-y-1.5">
            <Row icon="📅" label="Date de naissance" value={r.studentBirthDate
              ? new Date(r.studentBirthDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'} />
            <Row icon="●" label="Genre" value={r.studentGender === 'male' ? 'Garçon' : r.studentGender === 'female' ? 'Fille' : '—'} dot={r.studentGender === 'male' ? 'blue' : r.studentGender === 'female' ? 'pink' : undefined} />
            <Row icon="🎓" label="Niveau" value={r.grade ?? '—'} highlight />
          </div>
        </section>

        {/* Parents / Guardians */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Parents / Tuteurs</h3>
          <div className="space-y-1.5">
            {father && <Row icon="👤" label="Père" value={father.name} />}
            {mother && <Row icon="👤" label="Mère" value={mother.name} />}
            {!father && !mother && <p className="text-xs text-muted-foreground">—</p>}
          </div>
        </section>

        {/* Contact */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Contact</h3>
          <div className="space-y-1.5">
            {r.parents[0]?.email && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">Email principal</span>
                <a href={`mailto:${r.parents[0].email}`} className="text-blue-600 text-xs hover:underline">{r.parents[0].email}</a>
              </div>
            )}
            {r.parents[0]?.phone && <Row icon="" label="Téléphone principal" value={r.parents[0].phone} />}
          </div>
        </section>

        {/* Classes */}
        {r.classes.length > 0 && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Classes</h3>
            <p className="text-[11px] text-muted-foreground mb-1.5">Inscrit dans</p>
            <div className="flex flex-wrap gap-1.5">
              {r.classes.map(c => <ClassBadge key={c.fullCode} code={c.fullCode} />)}
            </div>
          </section>
        )}

        {/* Tuition & Financial */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Frais &amp; Finances</h3>
          <div className="space-y-1.5">
            <Row icon="$" label="Type de paiement" value={r.paymentFrequency ?? '—'} />
            <Row icon="" label="Aide financière" value={r.financialAid ?? '—'} />
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">Autorisation photo</span>
              <ConsentBadge value={r.photoConsent} label="" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">Acceptation du règlement</span>
              <ConsentBadge value={r.policyConsent} label="" />
            </div>
          </div>
        </section>

        {/* Enrollment Info */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Inscription</h3>
          <div className="space-y-1.5">
            <Row icon="🏫" label="École" value={schoolName} />
            <Row icon="#" label="Année" value={`${new Date(r.submittedAt).getFullYear()}-${new Date(r.submittedAt).getFullYear() + 1}`} />
          </div>
        </section>

        {/* Custom form fields */}
        {r.customFields && r.customFields.length > 0 && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Informations de l&apos;étudiant</h3>
            <div className="space-y-2">
              {r.customFields.map((cf, i) => (
                <div key={i} className="text-xs">
                  <p className="text-muted-foreground">{cf.label}</p>
                  <p className="font-medium mt-0.5 p-2 bg-muted/20 rounded border border-border/50">{cf.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, highlight, dot }: {
  icon: string
  label: string
  value: string
  highlight?: boolean
  dot?: 'blue' | 'pink'
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex items-center gap-1.5">
        {dot && (
          <span className={cn('h-2.5 w-2.5 rounded-full', dot === 'blue' ? 'bg-blue-500' : 'bg-pink-400')} />
        )}
        <span className={cn('text-xs', highlight ? 'text-[#2d6a4f] font-medium' : 'font-medium text-foreground')}>
          {value}
        </span>
      </div>
    </div>
  )
}

// ── Décision de l'admin ───────────────────────────────────────────────────────

function ReviewSection({ registration: r }: { registration: RegistrationWithDetails }) {
  const review = useReviewRegistration()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  async function decide(status: 'approved' | 'rejected', notes: string | null) {
    const result = await review.mutateAsync({ registrationId: r.id, status, notes })
    if (result.success) { setRejectOpen(false); setReason('') }
  }

  return (
    <section className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Décision</h3>

      {r.status !== 'pending' && (
        <p className="text-xs text-muted-foreground">
          {r.status === 'approved' ? 'Approuvée' : 'Rejetée'}
          {r.reviewedAt && ` le ${new Date(r.reviewedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          {r.reviewedByName && ` par ${r.reviewedByName}`}
        </p>
      )}
      {r.status === 'rejected' && r.reviewNotes && (
        <p className="text-xs p-2 rounded bg-red-50 border border-red-100 text-red-800">Motif : {r.reviewNotes}</p>
      )}

      {/* Une approbation est définitive : plus aucune action une fois l'inscription approuvée */}
      {r.status === 'approved' ? (
        <p className="text-[11px] text-muted-foreground">Décision définitive : l&apos;élève fait partie de l&apos;école.</p>
      ) : (
        <>
          <div className="flex gap-2">
            <Button size="sm" disabled={review.isPending} onClick={() => decide('approved', null)}
              className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white">
              <Check className="h-4 w-4" /> Approuver
            </Button>
            {r.status !== 'rejected' && (
              <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => setRejectOpen(true)}
                className="flex-1 gap-1.5 border-red-300 text-red-700 hover:bg-red-50">
                <Ban className="h-4 w-4" /> Rejeter
              </Button>
            )}
          </div>
        </>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeter l&apos;inscription</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {r.studentFirstName} {r.studentLastName} — le motif (facultatif) est transmis à la famille.
          </p>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Motif du refus (facultatif)"
            className="w-full text-sm border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-red-300"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Annuler</Button>
            <Button disabled={review.isPending} onClick={() => decide('rejected', reason.trim() || null)}
              className="bg-red-600 hover:bg-red-700 text-white">
              Rejeter l&apos;inscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
