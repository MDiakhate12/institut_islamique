'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useStudents } from '@/modules/students/students.hooks'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Plus, Download, ArrowUpDown, ArrowUp, ArrowDown, Columns2, Check, BookOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportStudentsToExcel } from './students.excel'
import { StudentFormDialog } from './StudentForm'
import { AssignClassDialog } from './AssignClassDialog'
import { ColumnFilter } from './ColumnFilter'
import type { StudentListItem } from '@/modules/students/students.types'
import { calcAge, guardianDisplayName } from '@/modules/students/students.types'

type GenderFilter  = 'all' | 'male' | 'female'
type ActiveFilter  = 'all' | 'active' | 'inactive'
type PayFilter     = 'all' | 'paid' | 'unpaid'

// ── Column visibility ──────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'age',              label: 'Âge',                          def: true  },
  { id: 'classes',          label: 'Classe(s)',                     def: true  },
  { id: 'teacher',          label: 'Enseignant',                    def: false },
  { id: 'previousTeacher',  label: 'Enseignant(e) précédent(e)',    def: true  },
  { id: 'status',           label: 'Statut',                        def: true  },
  { id: 'fatherPhone',      label: 'Tél. du père',                  def: false },
  { id: 'motherPhone',      label: 'Tél. de la mère',               def: false },
  { id: 'fatherEmail',      label: 'Email du père',                 def: false },
  { id: 'motherEmail',      label: 'Email de la mère',              def: false },
  { id: 'regFatherName',    label: 'Nom du père',                   def: false },
  { id: 'regMotherName',    label: 'Nom de la mère',                def: false },
  { id: 'enrollmentYear',   label: "Année d'inscription",           def: false },
  { id: 'createdAt',        label: "Date d'inscription",            def: true  },
  { id: 'attendance',       label: 'Présences',                     def: false },
] as const

type ColId = typeof COLUMNS[number]['id']
type VisibleCols = Record<ColId, boolean>
type SortKey     = 'name' | ColId
type ColFilters  = Partial<Record<SortKey, string[]>>

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

function buildClassOptions(students: StudentListItem[]): { id: string; code: string; name: string }[] {
  const classes = new Map<string, { id: string; code: string; name: string }>()
  students.forEach(s => s.enrollments.forEach(e => {
    classes.set(e.classId, { id: e.classId, code: e.classCode, name: e.className })
  }))
  return Array.from(classes.values()).sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }))
}

function findGuardian(s: StudentListItem, relationship: 'father' | 'mother') {
  return s.guardians.find(g => g.relationship === relationship)
}

function guardianName(s: StudentListItem, relationship: 'father' | 'mother', fallback: string | null) {
  const g = findGuardian(s, relationship)
  return g ? guardianDisplayName(g) : fallback
}

// Valeur utilisée pour trier chaque colonne (null/'' = toujours en fin de liste)
const SORT_VALUE: Record<SortKey, (s: StudentListItem) => string | number | null> = {
  name:            s => `${s.lastName} ${s.firstName}`,
  // Tri par âge : le plus jeune en premier en ordre croissant
  // (âge non calculable — date absente, invalide ou future — affiché « — » → en fin de liste)
  age:             s => calcAge(s.birthDate) === '—' ? null : -new Date(s.birthDate!).getTime(),
  classes:         s => s.enrollments[0] ? `${s.enrollments[0].classCode} ${s.enrollments[0].className}` : null,
  teacher:         s => s.enrollments[0]?.teacherName ?? null,
  previousTeacher: s => s.previousTeacher,
  status:          s => s.isActive ? 0 : 1,
  fatherPhone:     s => findGuardian(s, 'father')?.phone ?? s.regPhone,
  motherPhone:     s => findGuardian(s, 'mother')?.phone ?? null,
  fatherEmail:     s => findGuardian(s, 'father')?.email ?? s.regEmail,
  motherEmail:     s => findGuardian(s, 'mother')?.email ?? null,
  regFatherName:   s => guardianName(s, 'father', s.regFatherName),
  regMotherName:   s => guardianName(s, 'mother', s.regMotherName),
  enrollmentYear:  s => s.enrollmentYear,
  createdAt:       s => new Date(s.createdAt).getTime(),
  attendance:      s => s.attendancePresent,
}

function compareStudents(a: StudentListItem, b: StudentListItem, key: SortKey, asc: boolean): number {
  const va = SORT_VALUE[key](a)
  const vb = SORT_VALUE[key](b)
  const emptyA = va == null || va === '' || Number.isNaN(va)
  const emptyB = vb == null || vb === '' || Number.isNaN(vb)
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1
  const diff = typeof va === 'number' && typeof vb === 'number'
    ? va - vb
    : String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base', numeric: true })
  return asc ? diff : -diff
}

const EMPTY_VALUE = '(Vide)'

// Valeur(s) proposée(s) dans le filtre de chaque colonne — telles qu'affichées.
// Plusieurs valeurs possibles (ex. un élève dans 2 classes) : l'élève passe le
// filtre si l'une d'elles est cochée.
const FILTER_VALUES: Record<SortKey, (s: StudentListItem) => (string | null | undefined)[]> = {
  name:            s => [`${s.lastName.toUpperCase()} ${s.firstName}`],
  // Âge regroupé à l'année (« 10 ans »), sinon la liste serait inutilisable
  age:             s => { const a = calcAge(s.birthDate); return [a === '—' ? null : a.split(' et ')[0]] },
  classes:         s => s.enrollments.map(e => e.className ? `${e.classCode} — ${e.className}` : e.classCode),
  teacher:         s => s.enrollments.map(e => e.teacherName),
  previousTeacher: s => [s.previousTeacher],
  status:          s => [s.isActive ? 'Actif' : 'Inactif'],
  fatherPhone:     s => [SORT_VALUE.fatherPhone(s) as string | null],
  motherPhone:     s => [SORT_VALUE.motherPhone(s) as string | null],
  fatherEmail:     s => [SORT_VALUE.fatherEmail(s) as string | null],
  motherEmail:     s => [SORT_VALUE.motherEmail(s) as string | null],
  regFatherName:   s => [SORT_VALUE.regFatherName(s) as string | null],
  regMotherName:   s => [SORT_VALUE.regMotherName(s) as string | null],
  enrollmentYear:  s => [s.enrollmentYear],
  createdAt:       s => [new Date(s.createdAt).toLocaleDateString('fr-FR')],
  attendance:      s => [`${s.attendancePresent} présence${s.attendancePresent > 1 ? 's' : ''}`],
}

function filterValues(s: StudentListItem, key: SortKey): string[] {
  const values = FILTER_VALUES[key](s).filter((v): v is string => !!v)
  return values.length > 0 ? values : [EMPTY_VALUE]
}

// Options distinctes d'une colonne, dans l'ordre du tri croissant de cette colonne
function buildFilterOptions(students: StudentListItem[], key: SortKey): string[] {
  const ordered = [...students].sort((a, b) => compareStudents(a, b, key, true))
  return Array.from(new Set(ordered.flatMap(s => filterValues(s, key))))
}

// ── Main component ────────────────────────────────────────────────────────────

export function StudentsClient() {
  const { data: allStudents, isLoading } = useStudents()
  // Un enfant n'apparaît dans le tableau qu'une fois son inscription approuvée (§7.4) —
  // tant qu'elle est en attente ou rejetée, il n'est visible que dans « Inscriptions »
  const students = useMemo(() => allStudents?.filter(s => !s.awaitingApproval), [allStudents])

  const [search, setSearch]             = useState('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [yearFilter, setYearFilter]     = useState('all')
  const [classFilter, setClassFilter]   = useState('all')
  const [t1Filter, setT1Filter]         = useState<PayFilter>('all')
  const [t2Filter, setT2Filter]         = useState<PayFilter>('all')
  const [t3Filter, setT3Filter]         = useState<PayFilter>('all')
  const [sortKey, setSortKey]           = useState<SortKey | null>(null)
  const [sortAsc, setSortAsc]           = useState(true)
  const [colFilters, setColFilters]     = useState<ColFilters>({})
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null)
  const [selectedIds, setSelectedIds]    = useState<Set<string>>(new Set())
  const [assignOpen, setAssignOpen]      = useState(false)
  const [visibleCols, setVisibleCols]   = useState<VisibleCols>(() => {
    const defaults = Object.fromEntries(COLUMNS.map(c => [c.id, c.def])) as VisibleCols
    return defaults
  })

  // Lecture de localStorage après l'hydratation : la lire dès le premier rendu ferait diverger
  // le HTML serveur (colonnes par défaut) et le navigateur → erreur d'hydratation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchro avec localStorage (système externe), une fois au montage
    setVisibleCols(loadCols())
  }, [])

  function toggleCol(id: ColId) {
    // Masquer une colonne retire aussi son filtre (sinon il agirait de façon invisible)
    if (visibleCols[id]) setColFilter(id, [])
    setVisibleCols(prev => {
      const next = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* noop */ }
      return next
    })
  }

  function setColFilter(key: SortKey, values: string[]) {
    setColFilters(prev => {
      const next = { ...prev }
      if (values.length > 0) next[key] = values
      else delete next[key]
      return next
    })
  }

  const activeColFilters = Object.keys(colFilters).length

  const yearOptions  = useMemo(() => buildYearOptions(students ?? []), [students])
  const classOptions = useMemo(() => buildClassOptions(students ?? []), [students])

  const filtered = useMemo(() => {
    if (!students) return []
    const list = students.filter(s => {
      if (genderFilter !== 'all' && s.gender !== genderFilter) return false
      if (activeFilter === 'active'   && !s.isActive) return false
      if (activeFilter === 'inactive' &&  s.isActive) return false
      if (yearFilter   !== 'all' && s.enrollmentYear !== yearFilter) return false
      if (classFilter === 'none' && s.enrollments.length > 0) return false
      if (classFilter !== 'all' && classFilter !== 'none' && !s.enrollments.some(e => e.classId === classFilter)) return false
      if (t1Filter === 'paid'   && !s.paymentT1) return false
      if (t1Filter === 'unpaid' &&  s.paymentT1) return false
      if (t2Filter === 'paid'   && !s.paymentT2) return false
      if (t2Filter === 'unpaid' &&  s.paymentT2) return false
      if (t3Filter === 'paid'   && !s.paymentT3) return false
      if (t3Filter === 'unpaid' &&  s.paymentT3) return false
      for (const [key, selected] of Object.entries(colFilters) as [SortKey, string[]][]) {
        if (!filterValues(s, key).some(v => selected.includes(v))) return false
      }
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
    return sortKey ? list.sort((a, b) => compareStudents(a, b, sortKey, sortAsc)) : list
  }, [students, search, genderFilter, activeFilter, yearFilter, classFilter, t1Filter, t2Filter, t3Filter, colFilters, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(true) }
  }

  function toggleSelectStudent(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(s => s.id)))
    }
  }

  const thProps = {
    current: sortKey, asc: sortAsc, onSort: toggleSort,
    filters: colFilters, onFilter: setColFilter,
    filterOptions: (key: SortKey) => buildFilterOptions(students ?? [], key),
  }

  const total = filtered.length
  const allSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id))
  const visibleCount = COLUMNS.filter(c => visibleCols[c.id]).length

  return (
    <div className="p-4 sm:p-6 space-y-4">

      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
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

        {/* Classe */}
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none cursor-pointer max-w-[260px]"
        >
          <option value="all">Toutes les classes</option>
          {classOptions.map(c => (
            <option key={c.id} value={c.id}>{c.name ? `${c.code} — ${c.name}` : c.code}</option>
          ))}
          <option value="none">Sans classe</option>
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
          <span className="text-xs text-muted-foreground">Actif :</span>
          <button onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')} title="Actifs"
            className={cn('h-5 w-5 rounded-full border-2 transition-all', activeFilter === 'active' ? 'bg-green-500 border-green-500' : 'border-green-400 bg-white')} />
          <button onClick={() => setActiveFilter(activeFilter === 'inactive' ? 'all' : 'inactive')} title="Inactifs"
            className={cn('h-5 w-5 rounded-full border-2 transition-all', activeFilter === 'inactive' ? 'bg-red-400 border-red-400' : 'border-red-400 bg-white')} />
        </div>

        {activeColFilters > 0 && (
          <button
            type="button"
            onClick={() => setColFilters({})}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-[#c2440f]/10 text-[#c2440f] hover:bg-[#c2440f]/20 transition-colors"
          >
            <X className="h-3 w-3" />
            Réinitialiser les filtres de colonnes ({activeColFilters})
          </button>
        )}
      </div>

      {/* ── Tableau ── */}
      {isLoading ? <StudentsSkeleton visibleCount={visibleCount} /> : !students?.length ? (
        <EmptyState
          icon={Users}
          title="Aucun élève pour le moment"
          description="Créez votre premier élève."
          action={(
            <StudentFormDialog
              trigger={
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#2d6a4f] hover:bg-[#1b4332] text-white rounded-md transition-colors">
                  <Plus className="h-4 w-4" /> Créer un élève
                </button>
              }
            />
          )}
        />
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground uppercase tracking-wide">
                  {/* Checkbox select-all */}
                  <th className="px-3 py-3 w-8 sm:sticky sm:left-0 sm:z-10 bg-[#fefbf6] border-r border-border">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={allSelected}
                      aria-label="Sélectionner tous les élèves"
                      onClick={toggleSelectAll}
                      className={cn(
                        'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
                        allSelected ? 'bg-[#2d6a4f] border-[#2d6a4f]' : 'border-border bg-white'
                      )}
                    >
                      {allSelected && <Check className="h-2.5 w-2.5 text-white" />}
                    </button>
                  </th>
                  <SortTh label="Nom de l'élève" sortKey="name" {...thProps} className="min-w-[180px] sm:sticky sm:left-0 sm:z-10 bg-[#fefbf6] border-r border-border" />
                  {visibleCols.age              && <SortTh label="Âge"               sortKey="age"             {...thProps} className="min-w-[120px]" />}
                  {visibleCols.classes          && <SortTh label="Classe(s)"         sortKey="classes"         {...thProps} className="min-w-[200px]" />}
                  {visibleCols.teacher          && <SortTh label="Enseignant"        sortKey="teacher"         {...thProps} className="min-w-[140px]" />}
                  {visibleCols.previousTeacher  && <SortTh label="Ens. précédent(e)" sortKey="previousTeacher" {...thProps} className="min-w-[140px]" />}
                  {visibleCols.status           && <SortTh label="Statut"            sortKey="status"          {...thProps} />}
                  {visibleCols.fatherPhone      && <SortTh label="Tél. père"         sortKey="fatherPhone"     {...thProps} className="min-w-[140px]" />}
                  {visibleCols.motherPhone      && <SortTh label="Tél. mère"         sortKey="motherPhone"     {...thProps} className="min-w-[140px]" />}
                  {visibleCols.fatherEmail      && <SortTh label="Email père"        sortKey="fatherEmail"     {...thProps} className="min-w-[180px]" />}
                  {visibleCols.motherEmail      && <SortTh label="Email mère"        sortKey="motherEmail"     {...thProps} className="min-w-[180px]" />}
                  {visibleCols.regFatherName    && <SortTh label="Père"              sortKey="regFatherName"   {...thProps} className="min-w-[140px]" />}
                  {visibleCols.regMotherName    && <SortTh label="Mère"              sortKey="regMotherName"   {...thProps} className="min-w-[140px]" />}
                  {visibleCols.enrollmentYear   && <SortTh label="Année"             sortKey="enrollmentYear"  {...thProps} />}
                  {visibleCols.createdAt        && <SortTh label="Date d'inscription" sortKey="createdAt"      {...thProps} className="min-w-[140px]" />}
                  {visibleCols.attendance       && <SortTh label="Présences"         sortKey="attendance"      {...thProps} className="min-w-[120px]" />}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={2 + visibleCount} className="px-6 py-10 text-left text-sm text-muted-foreground">
                      Aucun élève ne correspond à ces filtres.
                    </td>
                  </tr>
                )}
                {filtered.map((s, i) => (
                  <StudentRow
                    key={s.id}
                    student={s}
                    index={i}
                    visibleCols={visibleCols}
                    onEdit={setEditingStudent}
                    selected={selectedIds.has(s.id)}
                    onToggleSelect={toggleSelectStudent}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Barre flottante sélection ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] text-white rounded-xl shadow-2xl">
          <span className="text-sm font-medium">
            {selectedIds.size} élève{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            onClick={() => setAssignOpen(true)}
            className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white gap-1.5 h-8"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Affecter à une classe
          </Button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Dialog édition — en dehors du tableau pour éviter le bubbling React portal.
          Rendu conditionnel pour que useForm remonte avec les bonnes defaultValues
          à chaque changement d'élève. */}
      {editingStudent && (
        <StudentFormDialog
          key={editingStudent.id}
          student={editingStudent}
          open={true}
          onOpenChange={v => { if (!v) setEditingStudent(null) }}
        />
      )}

      <AssignClassDialog
        studentIds={Array.from(selectedIds)}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onDone={() => setSelectedIds(new Set())}
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

function SortTh({ label, sortKey, current, asc, onSort, filters, onFilter, filterOptions, className }: {
  label: string
  sortKey: SortKey
  current: SortKey | null
  asc: boolean
  onSort: (key: SortKey) => void
  filters: ColFilters
  onFilter: (key: SortKey, values: string[]) => void
  filterOptions: (key: SortKey) => string[]
  className?: string
}) {
  const active = current === sortKey
  const Icon = !active ? ArrowUpDown : asc ? ArrowUp : ArrowDown
  return (
    <th className={cn('px-3 py-3 text-left font-semibold', className)}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={cn(
            'flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wide text-xs',
            active && 'text-[#c2440f]'
          )}
        >
          {label} <Icon className="h-3 w-3" />
        </button>
        <ColumnFilter
          label={label}
          options={filterOptions(sortKey)}
          selected={filters[sortKey] ?? []}
          onChange={values => onFilter(sortKey, values)}
        />
      </div>
    </th>
  )
}

function StudentRow({ student: s, index, visibleCols, onEdit, selected, onToggleSelect }: {
  student: StudentListItem
  index: number
  visibleCols: VisibleCols
  onEdit: (s: StudentListItem) => void
  selected: boolean
  onToggleSelect: (id: string) => void
}) {
  const teacherName = s.enrollments[0]?.teacherName ?? null

  return (
    <tr
      onClick={() => onEdit(s)}
      className={cn(
        'group border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors align-middle cursor-pointer',
        selected && 'bg-[#2d6a4f]/5'
      )}
    >
      {/* Checkbox sélection */}
      <td
        className={cn('px-3 py-3 w-8 sm:sticky sm:left-0 sm:z-10 border-r border-border/50', selected && 'bg-[#2d6a4f]/5')}
        onClick={e => { e.stopPropagation(); onToggleSelect(s.id) }}
      >
        <span className={cn(
          'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
          selected ? 'bg-[#2d6a4f] border-[#2d6a4f]' : 'border-border bg-white'
        )}>
          {selected && <Check className="h-2.5 w-2.5 text-white" />}
        </span>
      </td>

      {/* Nom + pastille genre — figé au scroll horizontal */}
      <td className="px-3 py-3 sm:sticky sm:left-0 sm:z-10 bg-white group-hover:bg-[#fdfbf8] border-r border-border/50">
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

      {visibleCols.previousTeacher && (
        <td className="px-3 py-3 text-sm text-muted-foreground">
          {s.previousTeacher ?? <span className="italic">—</span>}
        </td>
      )}

      {visibleCols.status && (
        <td className="px-3 py-3">
          <span className={cn(
            'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
            s.isActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
          )}>
            {s.isActive ? 'Actif' : 'Inactif'}
          </span>
        </td>
      )}

      {(['fatherPhone', 'motherPhone', 'fatherEmail', 'motherEmail', 'regFatherName', 'regMotherName', 'enrollmentYear'] as const)
        .filter(id => visibleCols[id])
        .map(id => (
          <td key={id} className="px-3 py-3 text-sm text-muted-foreground">
            {SORT_VALUE[id](s) || <span className="italic">—</span>}
          </td>
        ))}

      {visibleCols.createdAt && (
        <td className="px-3 py-3 text-sm text-muted-foreground">
          {new Date(s.createdAt).toLocaleDateString('fr-FR')}
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
