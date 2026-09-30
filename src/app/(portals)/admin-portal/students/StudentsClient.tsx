'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useStudents } from '@/modules/students/students.hooks'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Plus, Download, ArrowUpDown, Columns2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportStudentsToExcel } from './students.excel'
import { StudentFormDialog } from './StudentForm'
import type { StudentListItem } from '@/modules/students/students.types'
import { calcAge } from '@/modules/students/students.types'

type GenderFilter  = 'all' | 'male' | 'female'
type ActiveFilter  = 'all' | 'active' | 'inactive'
type SortKey       = 'name' | 'birthDate' | null
type PayFilter     = 'all' | 'paid' | 'unpaid'

// ── Column visibility ──────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'age',              label: 'Âge',                    def: true  },
  { id: 'classes',          label: 'Classe(s)',               def: true  },
  { id: 'teacher',          label: 'Enseignant',              def: true  },
  { id: 'status',           label: 'Statut',                  def: true  },
  { id: 'schoolGrade',      label: 'Niveau scolaire',         def: false },
  { id: 'paymentFrequency', label: 'Fréquence de paiement',   def: false },
  { id: 'phone',            label: 'Téléphone tuteur',        def: false },
  { id: 'enrollmentYear',   label: "Année d'inscription",     def: false },
  { id: 'attendance',       label: 'Présences',               def: false },
] as const

type ColId = typeof COLUMNS[number]['id']
type VisibleCols = Record<ColId, boolean>

const STORAGE_KEY = 'qaf:students:columns'

function loadCols(): VisibleCols {
  const defaults = Object.fromEntries(COLUMNS.map(c => [c.id, c.def])) as VisibleCols
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaults
    const parsed = JSON.parse(stored) as Partial<VisibleCols>
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildYearOptions(students: StudentListItem[]): string[] {
  const years = new Set<string>()
  students.forEach(s => { if (s.enrollmentYear) years.add(s.enrollmentYear) })
  return Array.from(years).sort().reverse()
}

// ── Main component ────────────────────────────────────────────────────────────

export function StudentsClient() {
  const { data: students, isLoading } = useStudents()

  const [search, setSearch]             = useState('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [yearFilter, setYearFilter]     = useState('all')
  const [t1Filter, setT1Filter]         = useState<PayFilter>('all')
  const [t2Filter, setT2Filter]         = useState<PayFilter>('all')
  const [t3Filter, setT3Filter]         = useState<PayFilter>('all')
  const [sortKey, setSortKey]           = useState<SortKey>(null)
  const [sortAsc, setSortAsc]           = useState(true)
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null)
  const [visibleCols, setVisibleCols]   = useState<VisibleCols>(() => {
    const defaults = Object.fromEntries(COLUMNS.map(c => [c.id, c.def])) as VisibleCols
    return defaults
  })

  // Hydrate from localStorage after mount
  useEffect(() => {
    setVisibleCols(loadCols())
  }, [])

  function toggleCol(id: ColId) {
    setVisibleCols(prev => {
      const next = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* noop */ }
      return next
    })
  }

  const yearOptions = useMemo(() => buildYearOptions(students ?? []), [students])

  const filtered = useMemo(() => {
    if (!students) return []
    let list = students.filter(s => {
      if (genderFilter !== 'all' && s.gender !== genderFilter) return false
      if (activeFilter === 'active'   && !s.isActive) return false
      if (activeFilter === 'inactive' &&  s.isActive) return false
      if (yearFilter   !== 'all' && s.enrollmentYear !== yearFilter) return false
      if (t1Filter === 'paid'   && !s.paymentT1) return false
      if (t1Filter === 'unpaid' &&  s.paymentT1) return false
      if (t2Filter === 'paid'   && !s.paymentT2) return false
      if (t2Filter === 'unpaid' &&  s.paymentT2) return false
      if (t3Filter === 'paid'   && !s.paymentT3) return false
      if (t3Filter === 'unpaid' &&  s.paymentT3) return false
      if (search) {
        const q = search.toLowerCase()
        const guardianMatch = s.guardians.some(g =>
          (g.phone ?? '').includes(q) ||
          (g.email ?? '').toLowerCase().includes(q) ||
          (g.firstName ?? '').toLowerCase().includes(q)
        )
        return (
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          (s.studentCustomId ?? '').toLowerCase().includes(q) ||
          s.enrollments.some(e => e.classCode.toLowerCase().includes(q)) ||
          guardianMatch
        )
      }
      return true
    })
    if (sortKey === 'name') {
      list = [...list].sort((a, b) =>
        (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName) * (sortAsc ? 1 : -1)
      )
    } else if (sortKey === 'birthDate') {
      list = [...list].sort((a, b) =>
        ((a.birthDate ?? '') < (b.birthDate ?? '') ? -1 : 1) * (sortAsc ? 1 : -1)
      )
    }
    return list
  }, [students, search, genderFilter, activeFilter, yearFilter, t1Filter, t2Filter, t3Filter, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(true) }
  }

  const total = filtered.length
  const visibleCount = COLUMNS.filter(c => visibleCols[c.id]).length

  return (
    <div className="p-6 space-y-4">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Élèves</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gérer les inscriptions et les profils des élèves</p>
          {!isLoading && <p className="text-base font-semibold text-foreground mt-1">{total} élève{total !== 1 ? 's' : ''}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline" size="sm"
            className="border-green-600 text-green-700 hover:bg-green-50 gap-1.5"
            onClick={() => students && exportStudentsToExcel(students)}
          >
            <Download className="h-4 w-4" />
            Télécharger en Excel
          </Button>
          <StudentFormDialog
            trigger={
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#2d6a4f] hover:bg-[#1b4332] text-white rounded-md transition-colors">
                <Plus className="h-4 w-4" />
                Créer un nouvel élève
              </button>
            }
          />
        </div>
      </div>

      {/* ── Recherche + bouton Colonnes ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Rechercher des élèves, parents, téléphones, codes de classe..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]/50"
          />
        </div>
        <ColumnsMenu visibleCols={visibleCols} onToggle={toggleCol} visibleCount={visibleCount} />
      </div>

      {/* ── Dropdowns + chips ── */}
      <div className="flex items-center flex-wrap gap-3">
        {/* Année */}
        <select
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none cursor-pointer"
        >
          <option value="all">Toutes les années</option>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* T1/T2/T3 filters */}
        {([
          { label: 'Trimestre 1', val: t1Filter, set: setT1Filter },
          { label: 'Trimestre 2', val: t2Filter, set: setT2Filter },
          { label: 'Trimestre 3', val: t3Filter, set: setT3Filter },
        ] as const).map(({ label, val, set }) => (
          <select
            key={label}
            value={val}
            onChange={e => set(e.target.value as PayFilter)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none cursor-pointer"
          >
            <option value="all">{label} : Tous</option>
            <option value="paid">{label} : Payé</option>
            <option value="unpaid">{label} : Non payé</option>
          </select>
        ))}

        {/* Chips genre */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Genre :</span>
          <button onClick={() => setGenderFilter(genderFilter === 'male' ? 'all' : 'male')} title="Garçons"
            className={cn('h-5 w-5 rounded-full border-2 transition-all', genderFilter === 'male' ? 'bg-blue-500 border-blue-500' : 'border-blue-400 bg-white')} />
          <button onClick={() => setGenderFilter(genderFilter === 'female' ? 'all' : 'female')} title="Filles"
            className={cn('h-5 w-5 rounded-full border-2 transition-all', genderFilter === 'female' ? 'bg-pink-400 border-pink-400' : 'border-pink-400 bg-white')} />
        </div>

        {/* Chips inscrit */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Inscrit :</span>
          <button onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')} title="Inscrits"
            className={cn('h-5 w-5 rounded-full border-2 transition-all', activeFilter === 'active' ? 'bg-green-500 border-green-500' : 'border-green-400 bg-white')} />
          <button onClick={() => setActiveFilter(activeFilter === 'inactive' ? 'all' : 'inactive')} title="Non inscrits"
            className={cn('h-5 w-5 rounded-full border-2 transition-all', activeFilter === 'inactive' ? 'bg-red-400 border-red-400' : 'border-red-400 bg-white')} />
        </div>
      </div>

      {/* ── Tableau ── */}
      {isLoading ? <StudentsSkeleton visibleCount={visibleCount} /> : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Aucun élève trouvé' : 'Aucun élève pour le moment'}
          description={search ? 'Essayez un autre terme.' : 'Créez votre premier élève.'}
          action={!search ? (
            <StudentFormDialog
              trigger={
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#2d6a4f] hover:bg-[#1b4332] text-white rounded-md transition-colors">
                  <Plus className="h-4 w-4" /> Créer un élève
                </button>
              }
            />
          ) : undefined}
        />
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground uppercase tracking-wide">
                  <SortTh label="Nom de l'élève" onClick={() => toggleSort('name')} className="sticky left-0 z-10 bg-[#fefbf6] border-r border-border" />
                  {visibleCols.age            && <SortTh label="Âge"                onClick={() => toggleSort('birthDate')} />}
                  {visibleCols.classes        && <th className="px-3 py-3 text-left min-w-[200px]">Classe(s)</th>}
                  {visibleCols.teacher        && <th className="px-3 py-3 text-left min-w-[140px]">Enseignant</th>}
                  {visibleCols.status         && <th className="px-3 py-3 text-left">Statut</th>}
                  {visibleCols.schoolGrade      && <th className="px-3 py-3 text-left min-w-[140px]">Niveau scolaire</th>}
                  {visibleCols.paymentFrequency && <th className="px-3 py-3 text-left min-w-[140px]">Fréquence</th>}
                  {visibleCols.phone           && <th className="px-3 py-3 text-left min-w-[140px]">Téléphone</th>}
                  {visibleCols.enrollmentYear  && <th className="px-3 py-3 text-left">Année</th>}
                  {visibleCols.attendance     && <th className="px-3 py-3 text-left min-w-[120px]">Présences</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <StudentRow key={s.id} student={s} index={i} visibleCols={visibleCols} onEdit={setEditingStudent} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog édition — en dehors du tableau pour éviter le bubbling React portal */}
      <StudentFormDialog
        student={editingStudent ?? undefined}
        open={!!editingStudent}
        onOpenChange={v => { if (!v) setEditingStudent(null) }}
      />

    </div>
  )
}

// ── Columns menu ──────────────────────────────────────────────────────────────

function ColumnsMenu({ visibleCols, onToggle, visibleCount }: {
  visibleCols: VisibleCols
  onToggle: (id: ColId) => void
  visibleCount: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors',
          open
            ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
            : 'bg-white border-border text-foreground hover:bg-muted/30'
        )}
      >
        <Columns2 className="h-4 w-4" />
        Colonnes
        <span className={cn(
          'inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold',
          open ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
        )}>
          {visibleCount}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-border bg-white shadow-lg py-1">
          <p className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Colonnes visibles
          </p>
          {COLUMNS.map(col => (
            <button
              key={col.id}
              type="button"
              onClick={() => onToggle(col.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/30 transition-colors text-left"
            >
              <span className={cn(
                'h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                visibleCols[col.id]
                  ? 'bg-[#2d6a4f] border-[#2d6a4f]'
                  : 'border-border bg-white'
              )}>
                {visibleCols[col.id] && <Check className="h-2.5 w-2.5 text-white" />}
              </span>
              {col.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SortTh({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <th className={cn('px-3 py-3 text-left font-semibold min-w-[180px]', className)}>
      <button onClick={onClick} className="flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wide text-xs">
        {label} <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  )
}

function StudentRow({ student: s, index, visibleCols, onEdit }: { student: StudentListItem; index: number; visibleCols: VisibleCols; onEdit: (s: StudentListItem) => void }) {
  const teacherName = s.enrollments[0]?.teacherName ?? null
  const primaryGuardian = s.guardians[0]

  return (
    <tr
      onClick={() => onEdit(s)}
      className="group border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors align-middle cursor-pointer"
    >
      {/* Nom + pastille genre — figé au scroll horizontal */}
      <td className="px-3 py-3 sticky left-0 z-10 bg-white group-hover:bg-[#fdfbf8] border-r border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs shrink-0">{index + 1}.</span>
          <span className={cn(
            'h-2 w-2 rounded-full shrink-0',
            s.gender === 'male'   ? 'bg-blue-400' :
            s.gender === 'female' ? 'bg-pink-400' : 'bg-gray-300'
          )} />
          <div>
            <p className="font-semibold text-foreground">{s.lastName.toUpperCase()} {s.firstName}</p>
            {s.studentCustomId && (
              <p className="text-xs text-muted-foreground">ID : {s.studentCustomId}</p>
            )}
          </div>
        </div>
      </td>

      {visibleCols.age && (
        <td className="px-3 py-3">
          {s.birthDate
            ? <span className="font-medium text-sm">{calcAge(s.birthDate)}</span>
            : <span className="text-muted-foreground">—</span>}
        </td>
      )}

      {visibleCols.classes && (
        <td className="px-3 py-3">
          {s.enrollments.length > 0 ? (
            <div className="flex flex-col gap-1">
              {s.enrollments.map(e => (
                <div key={e.enrollmentId} className="flex items-center gap-1.5">
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#2d6a4f] text-white shrink-0">
                    {e.classCode}
                  </span>
                  {e.className && (
                    <span className="text-xs text-muted-foreground truncate max-w-[160px]">{e.className}</span>
                  )}
                </div>
              ))}
            </div>
          ) : <span className="text-muted-foreground text-xs italic">Aucune</span>}
        </td>
      )}

      {visibleCols.teacher && (
        <td className="px-3 py-3 text-sm text-muted-foreground">
          {teacherName ?? <span className="italic">—</span>}
        </td>
      )}

      {visibleCols.status && (
        <td className="px-3 py-3">
          <span className={cn(
            'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
            s.isActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
          )}>
            {s.isActive ? 'Inscrit' : 'Inactif'}
          </span>
        </td>
      )}

      {visibleCols.schoolGrade && (
        <td className="px-3 py-3 text-sm text-muted-foreground">
          {s.schoolGrade ?? <span className="italic">—</span>}
        </td>
      )}

      {visibleCols.paymentFrequency && (
        <td className="px-3 py-3">
          {s.paymentFrequency ? (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {s.paymentFrequency === 'annually' ? 'Annuel' :
               s.paymentFrequency.startsWith('trimester') ? 'Trimestriel' : s.paymentFrequency}
            </span>
          ) : <span className="text-muted-foreground text-xs italic">—</span>}
        </td>
      )}

      {visibleCols.phone && (
        <td className="px-3 py-3 text-sm text-muted-foreground">
          {primaryGuardian?.phone ?? <span className="italic">—</span>}
        </td>
      )}

      {visibleCols.enrollmentYear && (
        <td className="px-3 py-3 text-sm text-muted-foreground">
          {s.enrollmentYear ?? <span className="italic">—</span>}
        </td>
      )}

      {visibleCols.attendance && (
        <td className="px-3 py-3">
          <div className="flex items-center gap-1 text-xs">
            {s.attendancePresent > 0 && (
              <span className="inline-flex px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                {s.attendancePresent}P
              </span>
            )}
            {s.attendanceLate > 0 && (
              <span className="inline-flex px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
                {s.attendanceLate}R
              </span>
            )}
            {s.attendanceAbsent > 0 && (
              <span className="inline-flex px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                {s.attendanceAbsent}A
              </span>
            )}
            {s.attendancePresent === 0 && s.attendanceLate === 0 && s.attendanceAbsent === 0 && (
              <span className="text-muted-foreground italic">—</span>
            )}
          </div>
        </td>
      )}

    </tr>
  )
}

function StudentsSkeleton({ visibleCount }: { visibleCount: number }) {
  const cols = 1 + visibleCount // sticky Nom + colonnes visibles
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-3 py-3"><Skeleton className="h-3 w-20" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {Array.from({ length: cols }).map((_, j) => (
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
