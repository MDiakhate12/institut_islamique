'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, CheckCircle2, Clock, XCircle, Copy, Info, ClipboardList, X, BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  usePinnedAttendanceClasses, useAttendanceStudents,
  useExistingAttendance, useSubmitAttendance, useRemovePinnedAttendanceClass,
} from '@/modules/attendance/attendance.hooks'
import type {
  PinnedAttendanceClass, AttendanceClassOption, AttendanceStatus, AttendanceStudent,
} from '@/modules/attendance/attendance.types'
import AddClassDialog from './AddClassDialog'
import SubmitAttendanceDialog from './SubmitAttendanceDialog'

type Props = {
  initialPinnedClasses: PinnedAttendanceClass[]
  initialClassOptions: AttendanceClassOption[]
  today: string
}

const SUBJECT_COLORS: Record<string, string> = {
  QRN: 'bg-emerald-100 text-emerald-800',
  NUR: 'bg-blue-100 text-blue-800',
  ARA: 'bg-purple-100 text-purple-800',
  ISL: 'bg-amber-100 text-amber-800',
}

function fmtDateLong(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtDateShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default function AttendanceClient({ initialPinnedClasses, today }: Props) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    initialPinnedClasses[0]?.classId ?? null
  )
  const [addClassOpen, setAddClassOpen] = useState(false)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  // Map of studentId → status (null = not marked)
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({})

  const { data: pinnedClasses = initialPinnedClasses } = usePinnedAttendanceClasses()
  const { data: students = [], isLoading: loadingStudents } = useAttendanceStudents(selectedClassId ?? '')
  const { data: existing } = useExistingAttendance(selectedClassId ?? '', today)
  const removePinned = useRemovePinnedAttendanceClass()
  const submit = useSubmitAttendance()

  const selectedClass = pinnedClasses.find(c => c.classId === selectedClassId)

  // Reset on class change (runs first, before existing updates)
  useEffect(() => {
    setStatuses({})
  }, [selectedClassId])

  // Populate from server when existing loads or refreshes after submit
  // Never clears — clearing is the class-change effect's responsibility
  useEffect(() => {
    if (existing?.records) {
      setStatuses(existing.records)
    }
  }, [existing])

  function setStatus(studentId: string, status: AttendanceStatus) {
    setStatuses(prev => {
      // Toggle off if clicking the already-active status
      if (prev[studentId] === status) {
        const next = { ...prev }
        delete next[studentId]
        return next
      }
      return { ...prev, [studentId]: status }
    })
  }

  const isSubmitted  = !!existing
  const markedCount  = Object.keys(statuses).length
  const presentCount = Object.values(statuses).filter(s => s === 'present').length
  const lateCount    = Object.values(statuses).filter(s => s === 'late').length
  const absentCount  = Object.values(statuses).filter(s => s === 'absent').length

  const canSubmit = markedCount > 0

  async function handleSubmit() {
    if (!selectedClassId) return
    const records = Object.entries(statuses).map(([studentId, status]) => ({ studentId, status }))
    const result = await submit.mutateAsync({ classId: selectedClassId, date: today, records })
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setSubmitDialogOpen(false)
    toast.success(
      `Présence soumise avec succès : ${presentCount} présent${presentCount > 1 ? 's' : ''}, ${lateCount} en retard, ${absentCount} absent${absentCount > 1 ? 's' : ''}`
    )
  }

  async function handleRemoveClass(pinnedId: string, classId: string) {
    if (!confirm('Retirer cette classe de votre liste ?')) return
    const result = await removePinned.mutateAsync(pinnedId)
    if (!result.success) { toast.error(result.error); return }
    if (selectedClassId === classId) {
      setSelectedClassId(pinnedClasses.filter(c => c.pinnedId !== pinnedId)[0]?.classId ?? null)
    }
    toast.success('Classe retirée')
  }

  return (
    <div className="flex flex-col bg-[#fdf6f0] min-h-screen">
      <div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-8">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#7a4f30]/10 rounded-xl p-2.5">
              <Users className="h-6 w-6 text-[#7a4f30]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#c2440f]">Prise de présence</h1>
              <p className="text-sm text-muted-foreground mt-0.5 capitalize">
                Aujourd&apos;hui · {fmtDateShort(today)}
              </p>
            </div>
          </div>

          <Button
            onClick={() => setAddClassOpen(true)}
            className="gap-2 shrink-0"
            style={{ backgroundColor: '#7a4f30' }}
          >
            <Plus className="h-4 w-4" />
            Ajouter une classe
          </Button>
        </div>

        {/* Class selector */}
        {pinnedClasses.length > 0 ? (
          <div>
            <p className="text-sm font-semibold text-[#7a4f30] mb-3 uppercase tracking-wide text-xs">
              Sélectionner une classe
            </p>
            <div className="flex flex-wrap gap-3">
              {pinnedClasses.map(cls => {
                const isSelected = cls.classId === selectedClassId
                const code = cls.catalogCode || `${cls.subjectCode}`
                return (
                  <button
                    key={cls.classId}
                    onClick={() => setSelectedClassId(cls.classId)}
                    className={cn(
                      'group relative text-left rounded-xl border-2 p-4 w-52 transition-all',
                      isSelected
                        ? 'border-blue-400 bg-blue-50 shadow-sm'
                        : 'border-border bg-white hover:border-gray-300 hover:shadow-sm'
                    )}
                  >
                    <span className={cn(
                      'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold mb-1',
                      SUBJECT_COLORS[cls.subjectCode] ?? 'bg-gray-100 text-gray-700'
                    )}>
                      {cls.subjectCode}
                    </span>
                    <p className="font-semibold text-sm text-foreground">{code}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cls.name}</p>

                    {/* Remove button */}
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveClass(cls.pinnedId, cls.classId) }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-gray-100"
                      title="Retirer cette classe"
                    >
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border bg-white p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Aucune classe sélectionnée</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez une classe pour commencer la prise de présence.
            </p>
            <Button
              onClick={() => setAddClassOpen(true)}
              className="mt-4 gap-2"
              style={{ backgroundColor: '#7a4f30' }}
            >
              <Plus className="h-4 w-4" />
              Ajouter une classe
            </Button>
          </div>
        )}

        {/* Student list */}
        {selectedClass && (
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Class header */}
            <div className="px-6 py-4 border-b border-border flex items-center gap-4">
              <div className="bg-[#7a4f30]/10 rounded-xl p-2">
                <ClipboardList className="h-5 w-5 text-[#7a4f30]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground">
                    {selectedClass.catalogCode || selectedClass.subjectCode}
                    {selectedClass.name ? ` – ${selectedClass.name}` : ''}
                  </p>
                  {isSubmitted && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Soumis
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                  <span>📅</span>
                  <span className="capitalize">{fmtDateLong(today)}</span>
                </div>
              </div>

              {/* Counters */}
              <div className="flex items-center gap-5 shrink-0">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{presentCount}</p>
                  <p className="text-xs text-muted-foreground">Présent</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-orange-500">{lateCount}</p>
                  <p className="text-xs text-muted-foreground">En retard</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-500">{absentCount}</p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </div>
              </div>
            </div>

            {/* Students */}
            {loadingStudents ? (
              <div className="px-6 py-12 text-center text-muted-foreground text-sm">
                Chargement des élèves...
              </div>
            ) : students.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground text-sm">
                Aucun élève dans cette classe.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {students.map(student => (
                  <StudentRow
                    key={student.studentId}
                    student={student}
                    status={statuses[student.studentId] ?? null}
                    onStatus={s => setStatus(student.studentId, s)}
                  />
                ))}
              </div>
            )}

            {/* Submit footer */}
            <div className="px-6 py-4 border-t border-border bg-gray-50/50 flex flex-col items-center gap-2">
              <Button
                onClick={() => setSubmitDialogOpen(true)}
                disabled={!canSubmit}
                className="gap-2 min-w-64"
                style={canSubmit ? { backgroundColor: '#7a4f30' } : undefined}
              >
                <ClipboardList className="h-4 w-4" />
                {!canSubmit
                  ? 'Marquez la présence pour soumettre'
                  : isSubmitted
                    ? 'Modifier la présence'
                    : 'Soumettre la présence'
                }
              </Button>
              {isSubmitted && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Présence déjà enregistrée pour aujourd&apos;hui
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <AddClassDialog open={addClassOpen} onClose={() => setAddClassOpen(false)} />

      <SubmitAttendanceDialog
        open={submitDialogOpen}
        onClose={() => setSubmitDialogOpen(false)}
        onConfirm={handleSubmit}
        isLoading={submit.isPending}
        counts={{ present: presentCount, late: lateCount, absent: absentCount, total: markedCount }}
      />
    </div>
  )
}

function StudentRow({
  student,
  status,
  onStatus,
}: {
  student: AttendanceStudent
  status: AttendanceStatus | null
  onStatus: (s: AttendanceStatus) => void
}) {
  const displayId = student.customId ?? null

  return (
    <div className="px-6 py-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm text-foreground">
            {student.firstName} {student.lastName.toUpperCase()}
          </span>
          <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>
        {displayId && (
          <p className="text-xs text-muted-foreground mt-0.5">ID: {displayId}</p>
        )}
      </div>

      {/* Status toggle buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <StatusButton
          label="Présent"
          icon={<CheckCircle2 className="h-4 w-4" />}
          active={status === 'present'}
          activeClass="bg-green-600 text-white border-green-600 hover:bg-green-700"
          inactiveClass="border-green-600 text-green-700 hover:bg-green-50"
          onClick={() => onStatus('present')}
        />
        <StatusButton
          label="En retard"
          icon={<Clock className="h-4 w-4" />}
          active={status === 'late'}
          activeClass="bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
          inactiveClass="border-orange-500 text-orange-600 hover:bg-orange-50"
          onClick={() => onStatus('late')}
        />
        <StatusButton
          label="Absent"
          icon={<XCircle className="h-4 w-4" />}
          active={status === 'absent'}
          activeClass="bg-red-500 text-white border-red-500 hover:bg-red-600"
          inactiveClass="border-red-500 text-red-600 hover:bg-red-50"
          onClick={() => onStatus('absent')}
        />
      </div>
    </div>
  )
}

function StatusButton({
  label, icon, active, activeClass, inactiveClass, onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  activeClass: string
  inactiveClass: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
        active ? activeClass : inactiveClass
      )}
    >
      {icon}
      {label}
    </button>
  )
}
