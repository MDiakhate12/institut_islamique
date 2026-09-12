'use client'

import { useState, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import {
  useStudents, useDeactivateStudent, useUpdateStudentNote,
} from '@/modules/students/students.hooks'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Plus, Download, ArrowUpDown, Check, X, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportStudentsToExcel } from './students.excel'
import { StudentFormDialog } from './StudentForm'
import { StudentAttendanceModal } from './StudentAttendanceModal'
import { StudentPaymentsModal } from './StudentPaymentsModal'
import { StudentHomeworkModal } from './StudentHomeworkModal'
import { StudentReportCardModal } from './StudentReportCardModal'
import type { StudentListItem } from '@/modules/students/students.types'
import { calcAge } from '@/modules/students/students.types'

type GenderFilter  = 'all' | 'male' | 'female'
type ActiveFilter  = 'all' | 'active' | 'inactive'
type SortKey       = 'name' | 'birthDate' | null
type PayFilter     = 'all' | 'paid' | 'unpaid'

interface ModalState { studentId: string; studentName: string }

function buildYearOptions(students: StudentListItem[]): string[] {
  const years = new Set<string>()
  students.forEach(s => { if (s.enrollmentYear) years.add(s.enrollmentYear) })
  return Array.from(years).sort().reverse()
}

export function StudentsClient() {
  const { data: students, isLoading } = useStudents()
  const { mutate: deactivate }        = useDeactivateStudent()
  const { mutate: saveNote }          = useUpdateStudentNote()

  const [search, setSearch]             = useState('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [yearFilter, setYearFilter]     = useState('all')
  const [t1Filter, setT1Filter]         = useState<PayFilter>('all')
  const [t2Filter, setT2Filter]         = useState<PayFilter>('all')
  const [t3Filter, setT3Filter]         = useState<PayFilter>('all')
  const [sortKey, setSortKey]           = useState<SortKey>(null)
  const [sortAsc, setSortAsc]           = useState(true)

  // Inline note editing
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteValue, setNoteValue]         = useState('')
  const noteInputRef = useRef<HTMLTextAreaElement | null>(null)

  // Modal states
  const [reportCardStudent, setReportCardStudent] = useState<StudentListItem | null>(null)
  const [attendanceModal, setAttendanceModal] = useState<ModalState | null>(null)
  const [paymentsModal, setPaymentsModal]     = useState<ModalState | null>(null)
  const [homeworkModal, setHomeworkModal]     = useState<ModalState | null>(null)

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

  function handleDeactivate(id: string) {
    deactivate(id, { onSuccess: r => { if (!r.success) toast.error(r.error) } })
  }

  function startEditNote(s: StudentListItem) {
    setEditingNoteId(s.id)
    setNoteValue(s.notes ?? '')
    setTimeout(() => noteInputRef.current?.focus(), 50)
  }

  function cancelEditNote() {
    setEditingNoteId(null)
    setNoteValue('')
  }

  function saveEditNote(studentId: string) {
    saveNote({ studentId, note: noteValue }, {
      onSuccess: r => {
        if (!r.success) { toast.error(r.error); return }
        setEditingNoteId(null)
        setNoteValue('')
      },
    })
  }

  const total = students?.length ?? 0

  return (
    <div className="p-6 space-y-4">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Élèves</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gérer les inscriptions et les profils des élèves</p>
          {!isLoading && <p className="text-xs text-muted-foreground mt-1">{total} élève{total !== 1 ? 's' : ''}</p>}
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
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#c2440f] hover:bg-[#a33a0d] text-white rounded-md transition-colors">
                <Plus className="h-4 w-4" />
                Créer un nouvel élève
              </button>
            }
          />
        </div>
      </div>

      {/* ── Recherche ── */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          type="text"
          placeholder="Rechercher des élèves, parents, téléphones, codes de classe..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30 focus:border-[#c2440f]/50"
        />
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
      {isLoading ? <StudentsSkeleton /> : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Aucun élève trouvé' : 'Aucun élève pour le moment'}
          description={search ? 'Essayez un autre terme.' : 'Créez votre premier élève.'}
          action={!search ? (
            <StudentFormDialog
              trigger={
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#c2440f] hover:bg-[#a33a0d] text-white rounded-md transition-colors">
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
                  <th className="px-3 py-3 text-left">Étoiles</th>
                  <th className="px-3 py-3 text-left">Trophée</th>
                  <SortTh label="Date de naissance" onClick={() => toggleSort('birthDate')} />
                  <th className="px-3 py-3 text-left min-w-[160px]">Parent 1</th>
                  <th className="px-3 py-3 text-left min-w-[130px]">Parent 2</th>
                  <th className="px-3 py-3 text-left min-w-[120px]">Téléphone</th>
                  <th className="px-3 py-3 text-left">Nb. classes</th>
                  <th className="px-3 py-3 text-left min-w-[120px]">Classes</th>
                  <th className="px-3 py-3 text-left">T1</th>
                  <th className="px-3 py-3 text-left">T2</th>
                  <th className="px-3 py-3 text-left">T3</th>
                  <th className="px-3 py-3 text-left">Statut</th>
                  <th className="px-3 py-3 text-center">Présent</th>
                  <th className="px-3 py-3 text-center">Retard</th>
                  <th className="px-3 py-3 text-center">Absent</th>
                  <th className="px-3 py-3 text-center">Excusé</th>
                  <th className="px-3 py-3 text-left min-w-[110px]">Année inscrit.</th>
                  <th className="px-3 py-3 text-left min-w-[110px]">Date adhésion</th>
                  <th className="px-3 py-3 text-left min-w-[120px]">Dernière présence</th>
                  <th className="px-3 py-3 text-left min-w-[130px]">N° urgence</th>
                  <th className="px-3 py-3 text-left min-w-[200px]">Commentaire</th>
                  <th className="px-3 py-3 text-left min-w-[300px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <StudentRow
                    key={s.id}
                    student={s}
                    index={i}
                    onDeactivate={handleDeactivate}
                    editingNoteId={editingNoteId}
                    noteValue={noteValue}
                    noteInputRef={noteInputRef}
                    onStartEditNote={startEditNote}
                    onCancelEditNote={cancelEditNote}
                    onSaveEditNote={saveEditNote}
                    onNoteChange={setNoteValue}
                    onOpenReportCard={() => setReportCardStudent(s)}
                    onOpenAttendance={() => setAttendanceModal({ studentId: s.id, studentName: `${s.firstName} ${s.lastName}` })}
                    onOpenPayments={() => setPaymentsModal({ studentId: s.id, studentName: `${s.firstName} ${s.lastName}` })}
                    onOpenHomework={() => setHomeworkModal({ studentId: s.id, studentName: `${s.firstName} ${s.lastName}` })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {reportCardStudent && (
        <StudentReportCardModal
          open
          onOpenChange={v => { if (!v) setReportCardStudent(null) }}
          student={reportCardStudent}
        />
      )}
      {attendanceModal && (
        <StudentAttendanceModal
          open
          onOpenChange={v => { if (!v) setAttendanceModal(null) }}
          studentId={attendanceModal.studentId}
          studentName={attendanceModal.studentName}
        />
      )}
      {paymentsModal && (
        <StudentPaymentsModal
          open
          onOpenChange={v => { if (!v) setPaymentsModal(null) }}
          studentId={paymentsModal.studentId}
          studentName={paymentsModal.studentName}
        />
      )}
      {homeworkModal && (
        <StudentHomeworkModal
          open
          onOpenChange={v => { if (!v) setHomeworkModal(null) }}
          studentId={homeworkModal.studentId}
          studentName={homeworkModal.studentName}
        />
      )}
    </div>
  )
}

function SortTh({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <th className={cn('px-3 py-3 text-left font-semibold min-w-[180px]', className)}>
      <button onClick={onClick} className="flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wide text-xs">
        {label} <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  )
}

function PaymentBadge({ paid, annual }: { paid: boolean; annual?: boolean }) {
  return (
    <span className={cn(
      'inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium',
      paid
        ? 'bg-green-100 text-green-700 border border-green-200'
        : 'bg-red-50 text-red-600 border border-red-200'
    )}>
      {paid ? (annual ? 'Payé (Annuel)' : 'Payé') : 'Non payé'}
    </span>
  )
}

function StudentRow({
  student: s, index, onDeactivate,
  editingNoteId, noteValue, noteInputRef,
  onStartEditNote, onCancelEditNote, onSaveEditNote, onNoteChange,
  onOpenReportCard, onOpenAttendance, onOpenPayments, onOpenHomework,
}: {
  student: StudentListItem
  index: number
  onDeactivate: (id: string) => void
  editingNoteId: string | null
  noteValue: string
  noteInputRef: React.RefObject<HTMLTextAreaElement | null>
  onStartEditNote: (s: StudentListItem) => void
  onCancelEditNote: () => void
  onSaveEditNote: (id: string) => void
  onNoteChange: (v: string) => void
  onOpenReportCard: () => void
  onOpenAttendance: () => void
  onOpenPayments: () => void
  onOpenHomework: () => void
}) {
  const father = s.guardians.find(g => g.relationship === 'father' || g.isPrimary)
  const mother = s.guardians.find(g => g.relationship === 'mother') ?? s.guardians.find(g => !g.isPrimary)
  const emergencyPhone = father?.emergencyPhone ?? s.guardians.find(g => g.emergencyPhone)?.emergencyPhone
  const isEditingNote = editingNoteId === s.id
  const [editOpen, setEditOpen] = useState(false)

  return (
    <tr
      onClick={() => setEditOpen(true)}
      className="group border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors align-top cursor-pointer"
    >
      {/* Nom + ID — figé au scroll horizontal */}
      <td className="px-3 py-3 sticky left-0 z-10 bg-white group-hover:bg-[#fdfbf8] border-r border-border/50">
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground text-xs mt-0.5 shrink-0">{index + 1}.</span>
          <div className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', s.isActive ? 'bg-blue-500' : 'bg-gray-300')} />
          <div>
            <p className="font-semibold text-foreground">{s.lastName} {s.firstName}</p>
            {s.studentCustomId && (
              <p className="text-xs text-muted-foreground mt-0.5">ID : {s.studentCustomId}</p>
            )}
          </div>
        </div>
      </td>

      {/* Étoiles */}
      <td className="px-3 py-3"><span className="text-amber-500">⭐</span> 0</td>

      {/* Trophée */}
      <td className="px-3 py-3 text-muted-foreground text-xs italic">Pas encore</td>

      {/* Date naissance */}
      <td className="px-3 py-3">
        {s.birthDate ? (
          <div>
            <p className="font-medium">{calcAge(s.birthDate)}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(s.birthDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ) : <span className="text-muted-foreground">—</span>}
      </td>

      {/* Parent 1 (père) */}
      <td className="px-3 py-3">
        {father ? (
          <div>
            <p className="font-medium text-xs">{father.linkedMemberName ?? father.firstName} {father.lastName}</p>
            {father.email && <p className="text-xs text-muted-foreground truncate max-w-36">{father.email}</p>}
          </div>
        ) : <span className="text-muted-foreground text-xs italic">—</span>}
      </td>

      {/* Parent 2 (mère) */}
      <td className="px-3 py-3">
        {mother ? (
          <div>
            <p className="font-medium text-xs">{mother.linkedMemberName ?? mother.firstName} {mother.lastName}</p>
            {mother.email && <p className="text-xs text-muted-foreground truncate max-w-32">{mother.email}</p>}
          </div>
        ) : <span className="text-muted-foreground text-xs italic">—</span>}
      </td>

      {/* Téléphone */}
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {s.phone ?? '—'}
      </td>

      {/* Nb classes */}
      <td className="px-3 py-3 text-center">
        <span className="font-medium">{s.enrollments.length}</span>
        <span className="text-xs text-muted-foreground ml-1">classe{s.enrollments.length !== 1 ? 's' : ''}</span>
      </td>

      {/* Classes (codes) */}
      <td className="px-3 py-3">
        {s.enrollments.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {s.enrollments.map(e => (
              <span key={e.enrollmentId} className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#7a4f30] text-white">
                {e.classCode || e.className}
              </span>
            ))}
          </div>
        ) : <span className="text-muted-foreground text-xs italic">Aucune</span>}
      </td>

      {/* Paiements T1/T2/T3 */}
      <td className="px-3 py-3"><PaymentBadge paid={s.paymentT1} annual={s.paymentAnnual} /></td>
      <td className="px-3 py-3"><PaymentBadge paid={s.paymentT2} annual={s.paymentAnnual} /></td>
      <td className="px-3 py-3"><PaymentBadge paid={s.paymentT3} annual={s.paymentAnnual} /></td>

      {/* Statut */}
      <td className="px-3 py-3">
        <span className={cn(
          'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
          s.isActive ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
        )}>
          {s.isActive ? 'Inscrit' : 'Inactif'}
        </span>
      </td>

      {/* Présences — données réelles */}
      <td className="px-3 py-3 text-center">
        <AttBadge value={s.attendancePresent} color="blue" />
      </td>
      <td className="px-3 py-3 text-center">
        <AttBadge value={s.attendanceLate} color="orange" />
      </td>
      <td className="px-3 py-3 text-center">
        <AttBadge value={s.attendanceAbsent} color="red" />
      </td>
      <td className="px-3 py-3 text-center">
        <AttBadge value={s.attendanceExcused} color="purple" />
      </td>

      {/* Année inscription */}
      <td className="px-3 py-3 text-xs">{s.enrollmentYear ?? '—'}</td>

      {/* Date adhésion */}
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {s.enrolledAt
          ? new Date(s.enrolledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
          : new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>

      {/* Dernière présence — données réelles */}
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {s.lastAttendanceDate
          ? new Date(s.lastAttendanceDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Jamais'}
      </td>

      {/* Numéro urgence */}
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {emergencyPhone ?? '—'}
      </td>

      {/* Commentaire inline éditable */}
      <td className="px-3 py-3 min-w-[200px]" onClick={e => e.stopPropagation()}>
        {isEditingNote ? (
          <div className="flex flex-col gap-1">
            <textarea
              ref={noteInputRef}
              value={noteValue}
              onChange={e => onNoteChange(e.target.value)}
              rows={2}
              className="w-full text-xs border border-[#c2440f]/50 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30"
            />
            <div className="flex gap-1">
              <button
                onClick={() => onSaveEditNote(s.id)}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs bg-[#c2440f] text-white hover:bg-[#a33a0d]"
              >
                <Check className="w-3 h-3" /> Sauvegarder
              </button>
              <button
                onClick={onCancelEditNote}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <X className="w-3 h-3" /> Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onStartEditNote(s)}
            className="flex items-start gap-1.5 group text-left w-full"
          >
            <Pencil className="w-3 h-3 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {s.notes ?? 'Cliquer pour ajouter un commentaire'}
            </span>
          </button>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={onOpenReportCard}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Bulletin
          </button>
          <button
            onClick={onOpenAttendance}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors"
          >
            Présences
          </button>
          <button
            onClick={onOpenPayments}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium bg-green-50 border-green-200 text-green-700 hover:bg-green-100 transition-colors"
          >
            Paiements
          </button>
          <button
            onClick={onOpenHomework}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors"
          >
            Devoirs
          </button>
          <StudentFormDialog
            student={s}
            open={editOpen}
            onOpenChange={setEditOpen}
            trigger={
              <button className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-muted transition-colors">
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M4 16l-.5 4 4-.5 9.293-9.293-3.536-3.536L4 16z" />
                </svg>
              </button>
            }
          />
        </div>
      </td>
    </tr>
  )
}

function AttBadge({ value, color }: { value: number; color: 'blue' | 'orange' | 'red' | 'purple' }) {
  const cls = {
    blue:   'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    red:    'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
  }[color]
  return (
    <span className={cn('inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[11px] font-semibold', cls)}>
      {value}
    </span>
  )
}

function StudentsSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {Array.from({ length: 14 }).map((_, i) => (
                <th key={i} className="px-3 py-3"><Skeleton className="h-3 w-20" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {Array.from({ length: 14 }).map((_, j) => (
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
