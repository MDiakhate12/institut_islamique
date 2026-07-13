'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  useAdminDayOverview, useAdminSubmitAttendance,
  useAttendanceStudents, useExistingAttendance,
} from '@/modules/attendance/attendance.hooks'
import type {
  AdminDayOverview, AdminClassOverview,
  AttendanceStatus, AdminStudentEntry,
} from '@/modules/attendance/attendance.types'
import type { AttendanceStudent } from '@/modules/attendance/attendance.types'
import { StudentListDialog } from './StudentListDialog'
import type { DialogStatusFilter } from './StudentListDialog'
import { getSubjectColor } from '@/modules/classes/classes.types'
import {
  Bell, ChevronLeft, ChevronRight, Calendar, Users,
  Check, Clock, X, FileText, ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Présent',
  late:    'En retard',
  absent:  'Absent',
  excused: 'Excusé',
}

const STATUS_ACTIVE_CLS: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 border-green-300 text-green-700',
  late:    'bg-amber-100 border-amber-300 text-amber-700',
  absent:  'bg-red-100  border-red-300  text-red-700',
  excused: 'bg-blue-100 border-blue-300 text-blue-700',
}

// ── Root component ───────────────────────────────────────────────────────────

export function AdminAttendanceClient() {
  const [selectedDate,   setSelectedDate]   = useState(() => new Date())
  const [selectedClass,  setSelectedClass]  = useState<AdminClassOverview | null>(null)
  const [dialogFilter,   setDialogFilter]   = useState<DialogStatusFilter | null>(null)

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: overview, isLoading } = useAdminDayOverview(dateStr)

  const prevDay  = () => setSelectedDate(d => subDays(d, 1))
  const nextDay  = () => setSelectedDate(d => addDays(d, 1))
  const goToday  = () => setSelectedDate(new Date())

  const isCurrentToday = isToday(selectedDate)

  const formattedDate = format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
  const formattedDateCapitalized = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  return (
    <div className="p-6 space-y-6">
      {/* ── Page header ── */}
      {!selectedClass && (
        <div>
          <h1 className="text-xl font-semibold">Suivi des présences</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Suivre les présences des élèves de l&apos;école
          </p>
        </div>
      )}

      {/* ── Date navigation ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-white border border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>Présences du <span className="font-semibold">{formattedDateCapitalized}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => toast.info('Fonctionnalité à venir')}
          >
            <FileText className="h-3.5 w-3.5" />
            Résumé
          </Button>
          <Button variant="outline" size="sm" onClick={prevDay} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isCurrentToday}
            onClick={goToday}
            className="text-xs h-8 px-3"
          >
            Aujourd&apos;hui
          </Button>
          <Button variant="outline" size="sm" onClick={nextDay} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Views ── */}
      {selectedClass ? (
        <ClassDetailView
          cls={selectedClass}
          dateStr={dateStr}
          displayDate={formattedDateCapitalized}
          onBack={() => setSelectedClass(null)}
        />
      ) : (
        <OverviewView
          overview={overview ?? null}
          isLoading={isLoading}
          onSelectClass={setSelectedClass}
          onOpenDialog={setDialogFilter}
        />
      )}

      {/* ── Student list dialog ── */}
      {dialogFilter !== null && overview && (
        <StudentListDialog
          open={dialogFilter !== null}
          onClose={() => setDialogFilter(null)}
          statusFilter={dialogFilter}
          entries={overview.studentEntries}
        />
      )}
    </div>
  )
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewView({
  overview,
  isLoading,
  onSelectClass,
  onOpenDialog,
}: {
  overview: AdminDayOverview | null
  isLoading: boolean
  onSelectClass: (cls: AdminClassOverview) => void
  onOpenDialog: (f: DialogStatusFilter) => void
}) {
  const ov = overview ?? {
    totalClasses: 0, submittedCount: 0, missingCount: 0,
    totalStudents: 0, totalPresent: 0, totalLate: 0,
    totalAbsent: 0, totalExcused: 0, totalUnmarked: 0,
    teacherCount: 0, teachersSubmitted: 0,
    classes: [], studentEntries: [],
  }

  // Group classes by room
  const byRoom = useMemo(() => {
    const map = new Map<string, AdminClassOverview[]>()
    for (const c of ov.classes) {
      const key = c.room ?? 'Sans salle'
      const list = map.get(key) ?? []
      list.push(c)
      map.set(key, list)
    }
    return map
  }, [ov.classes])

  if (isLoading) return <OverviewSkeleton />

  return (
    <div className="space-y-6">
      {/* ── Aperçu des présences ── */}
      <section className="bg-white rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold">Aperçu des présences</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{ov.teachersSubmitted}/{ov.teacherCount}</span>
              {' '}enseignant{ov.teacherCount !== 1 ? 's' : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[#7a4f30] border-[#7a4f30] hover:bg-[#7a4f30] hover:text-white"
              onClick={() => toast.info('Fonctionnalité à venir')}
            >
              <Bell className="h-3.5 w-3.5" />
              Relancer les enseignants
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Classes soumises"
            value={ov.submittedCount}
            icon={<Check className="h-4 w-4" />}
            color="green"
          />
          <KpiCard
            label="Classes manquantes"
            value={ov.missingCount}
            icon={<X className="h-4 w-4" />}
            color="red"
          />
          <KpiCard
            label="Total de classes"
            value={ov.totalClasses}
            icon={<Calendar className="h-4 w-4" />}
            color="neutral"
          />
          <KpiCard
            label="Total d'élèves"
            value={ov.totalStudents}
            icon={<Users className="h-4 w-4" />}
            color="neutral"
          />
        </div>
      </section>

      {/* ── Statistiques des élèves ── */}
      <section className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-semibold">Statistiques des élèves</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <ClickableKpi label="Présent"    value={ov.totalPresent}  color="green"   onClick={() => onOpenDialog('present')}  />
          <ClickableKpi label="En retard"  value={ov.totalLate}     color="amber"   onClick={() => onOpenDialog('late')}     />
          <ClickableKpi label="Absent"     value={ov.totalAbsent}   color="red"     onClick={() => onOpenDialog('absent')}   />
          <ClickableKpi label="Excusé"     value={ov.totalExcused}  color="blue"    onClick={() => onOpenDialog('excused')}  />
          <ClickableKpi label="Non marqué" value={ov.totalUnmarked} color="gray"    onClick={() => onOpenDialog('unmarked')} />
        </div>
      </section>

      {/* ── Sélectionner une classe ── */}
      {ov.classes.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-semibold">Sélectionner une classe</h2>
          {Array.from(byRoom.entries()).map(([room, cls]) => (
            <div key={room} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Salle : {room} — {cls.length} classe{cls.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cls.map(c => (
                  <ClassCard key={c.classId} cls={c} onClick={() => onSelectClass(c)} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {ov.classes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-border">
          <Users className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">Aucune classe active</p>
          <p className="text-sm text-muted-foreground mt-1">
            Créez des classes pour commencer le suivi des présences.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Class card ────────────────────────────────────────────────────────────────

function ClassCard({ cls, onClick }: { cls: AdminClassOverview; onClick: () => void }) {
  const colors = getSubjectColor(cls.subjectCode)

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white rounded-xl border border-border p-4 hover:shadow-sm transition-shadow space-y-2 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {!cls.isSubmitted && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Manquant</Badge>
          )}
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', colors.bg, colors.text)}>
            {cls.subjectCode}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold leading-snug line-clamp-2">{cls.name}</p>
        {cls.section && (
          <p className="text-xs text-muted-foreground mt-0.5">{cls.section}</p>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Enseignant : <span className="font-medium text-foreground">{cls.teacherName ?? '—'}</span></p>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{cls.studentCount} élève{cls.studentCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className={cn(
        'flex items-center gap-1.5 text-xs font-medium',
        cls.isSubmitted ? 'text-green-600' : 'text-red-500'
      )}>
        {cls.isSubmitted ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Soumis
          </>
        ) : (
          <>
            <div className="h-2 w-2 rounded-full bg-red-400" />
            Présences requises
          </>
        )}
      </div>
    </button>
  )
}

// ── Class detail view ─────────────────────────────────────────────────────────

function ClassDetailView({
  cls,
  dateStr,
  displayDate,
  onBack,
}: {
  cls: AdminClassOverview
  dateStr: string
  displayDate: string
  onBack: () => void
}) {
  const { data: students = [], isLoading: loadingStudents } = useAttendanceStudents(cls.classId)
  const { data: existing } = useExistingAttendance(cls.classId, dateStr)
  const { mutateAsync: submit, isPending } = useAdminSubmitAttendance()

  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({})
  const [initialized, setInitialized] = useState(false)

  // Init from existing attendance
  useEffect(() => {
    if (existing !== undefined && !initialized) {
      setStatuses(existing?.records ?? {})
      setInitialized(true)
    }
  }, [existing, initialized])

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStatuses(prev => ({ ...prev, [studentId]: status }))
  }

  const counts = useMemo(() => {
    let present = 0, late = 0, absent = 0, excused = 0, unmarked = 0
    for (const s of students) {
      const st = statuses[s.studentId]
      if (st === 'present') present++
      else if (st === 'late') late++
      else if (st === 'absent') absent++
      else if (st === 'excused') excused++
      else unmarked++
    }
    return { present, late, absent, excused, unmarked }
  }, [students, statuses])

  const handleSubmit = async () => {
    const result = await submit({
      classId: cls.classId,
      date:    dateStr,
      records: students.map(s => ({ studentId: s.studentId, status: statuses[s.studentId] ?? 'present' })),
    })
    if (result.success) {
      toast.success('Présences mises à jour')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux classes
          </button>
          <h2 className="text-lg font-semibold">{cls.name}</h2>
          <p className="text-sm text-muted-foreground">{displayDate}</p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isPending || loadingStudents}
          className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5 shrink-0"
        >
          <Check className="h-4 w-4" />
          {isPending ? 'Enregistrement…' : 'Mettre à jour les présences'}
        </Button>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-5 gap-2">
        <MiniKpi label="Total"     value={students.length} color="neutral" />
        <MiniKpi label="Présent"   value={counts.present}  color="green"   />
        <MiniKpi label="En retard" value={counts.late}     color="amber"   />
        <MiniKpi label="Absent"    value={counts.absent}   color="red"     />
        <MiniKpi label="Excusé"    value={counts.excused}  color="blue"    />
      </div>

      {/* Student list */}
      <div className="bg-white rounded-xl border border-border divide-y divide-border overflow-hidden">
        {loadingStudents ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="h-4 bg-muted rounded w-32 animate-pulse" />
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="h-7 w-20 bg-muted rounded-full animate-pulse" />
                ))}
              </div>
            </div>
          ))
        ) : students.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Aucun élève inscrit dans cette classe
          </div>
        ) : (
          students.map(s => (
            <StudentRow
              key={s.studentId}
              student={s}
              status={statuses[s.studentId] ?? null}
              onStatusChange={status => setStatus(s.studentId, status)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Student row ───────────────────────────────────────────────────────────────

function StudentRow({
  student,
  status,
  onStatusChange,
}: {
  student: AttendanceStudent
  status: AttendanceStatus | null
  onStatusChange: (s: AttendanceStatus) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 flex-wrap">
      <div>
        <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
        {student.customId && (
          <p className="text-xs text-muted-foreground">{student.customId}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onStatusChange(s)}
            className={cn(
              'px-3 py-1 text-xs rounded-full border font-medium transition-colors',
              status === s
                ? STATUS_ACTIVE_CLS[s]
                : 'bg-white border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Reusable small components ─────────────────────────────────────────────────

type KpiColor = 'green' | 'red' | 'amber' | 'blue' | 'neutral' | 'gray'

const KPI_BG: Record<KpiColor, string> = {
  green:   'bg-green-50  border-green-200',
  red:     'bg-red-50    border-red-200',
  amber:   'bg-amber-50  border-amber-200',
  blue:    'bg-blue-50   border-blue-200',
  neutral: 'bg-gray-50   border-border',
  gray:    'bg-gray-50   border-border',
}

const KPI_VALUE: Record<KpiColor, string> = {
  green:   'text-green-700',
  red:     'text-red-600',
  amber:   'text-amber-700',
  blue:    'text-blue-700',
  neutral: 'text-foreground',
  gray:    'text-muted-foreground',
}

const KPI_ICON: Record<KpiColor, string> = {
  green:   'text-green-500',
  red:     'text-red-500',
  amber:   'text-amber-500',
  blue:    'text-blue-500',
  neutral: 'text-muted-foreground',
  gray:    'text-gray-400',
}

function KpiCard({ label, value, icon, color }: {
  label: string
  value: number
  icon: React.ReactNode
  color: KpiColor
}) {
  return (
    <div className={cn('rounded-lg border p-3 flex items-center gap-3', KPI_BG[color])}>
      <div className={cn('shrink-0', KPI_ICON[color])}>{icon}</div>
      <div>
        <p className={cn('text-xl font-bold tabular-nums', KPI_VALUE[color])}>{value}</p>
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  )
}

function ClickableKpi({ label, value, color, onClick }: {
  label: string
  value: number
  color: KpiColor
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border p-3 text-center transition-shadow hover:shadow-sm cursor-pointer w-full',
        KPI_BG[color]
      )}
    >
      <p className={cn('text-2xl font-bold tabular-nums', KPI_VALUE[color])}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </button>
  )
}

function MiniKpi({ label, value, color }: { label: string; value: number; color: KpiColor }) {
  return (
    <div className={cn('rounded-lg border p-2.5 text-center', KPI_BG[color])}>
      <p className={cn('text-xl font-bold tabular-nums', KPI_VALUE[color])}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <div className="h-5 bg-muted rounded w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-muted rounded-lg h-16" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <div className="h-5 bg-muted rounded w-48" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-muted rounded-lg h-16" />
          ))}
        </div>
      </div>
    </div>
  )
}
