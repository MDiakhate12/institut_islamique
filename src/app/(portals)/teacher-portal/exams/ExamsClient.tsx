'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { GraduationCap, Search, MapPin, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTeacherExamClasses } from '@/modules/exams/exams.hooks'
import type { TeacherExamClass, StudentGradeStatus } from '@/modules/exams/exams.types'

interface Props {
  initialClasses: TeacherExamClass[]
  trimester: number
  academicYear: string
  examPeriodOpen: boolean
}

const SUBJECT_COLORS: Record<string, string> = {
  QRN: 'bg-blue-100 text-blue-700',
  NUR: 'bg-purple-100 text-purple-700',
  ARB: 'bg-green-100 text-green-700',
  ISL: 'bg-amber-100 text-amber-700',
}

function StudentRow({ student, classId, examPeriodOpen }: {
  student: StudentGradeStatus
  classId: string
  examPeriodOpen: boolean
}) {
  const row = (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
        student.isGraded ? 'bg-green-100' : 'bg-gray-100',
      )}>
        <svg className={cn('h-4 w-4', student.isGraded ? 'text-green-600' : 'text-gray-400')} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{student.firstName} {student.lastName}</p>
        {student.studentCustomId && (
          <p className="text-xs text-muted-foreground">ID: {student.studentCustomId}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {student.isGraded ? (
          <span className="flex items-center gap-1 text-sm font-medium text-green-600">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            Noté
          </span>
        ) : (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
            Non noté
          </span>
        )}
      </div>
    </div>
  )

  if (!examPeriodOpen) return <div className="cursor-not-allowed opacity-60">{row}</div>

  return (
    <Link href={`/teacher-portal/exams/${classId}/${student.studentId}`} className="block">
      {row}
    </Link>
  )
}

function ClassCard({ cls, search, examPeriodOpen }: {
  cls: TeacherExamClass
  search: string
  examPeriodOpen: boolean
}) {
  const filtered = search
    ? cls.students.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        (s.studentCustomId ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : cls.students

  const subjectColor = SUBJECT_COLORS[cls.subjectCode ?? ''] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
      {/* Header */}
      <div className="bg-[#c2440f] px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <GraduationCap className="h-5 w-5 text-white shrink-0" />
          <div className="min-w-0">
            {cls.subjectCode && (
              <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold mr-2', subjectColor)}>
                {cls.subjectCode}
              </span>
            )}
            <span className="text-white font-semibold text-sm">{cls.className}</span>
            {cls.room && (
              <div className="flex items-center gap-1 text-orange-200 text-xs mt-0.5">
                <MapPin className="h-3 w-3" />
                <span>Salle {cls.room}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-white font-bold text-lg leading-none">{cls.gradedCount}/{cls.totalStudents}</p>
          <p className="text-orange-200 text-xs">Noté</p>
        </div>
      </div>

      {/* Student list */}
      <div className="divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-sm text-center text-muted-foreground">Aucun élève trouvé</p>
        ) : (
          filtered.map(s => (
            <StudentRow key={s.studentId} student={s} classId={cls.classId} examPeriodOpen={examPeriodOpen} />
          ))
        )}
      </div>
    </div>
  )
}

export function ExamsClient({ initialClasses, trimester, academicYear, examPeriodOpen }: Props) {
  const [search, setSearch] = useState('')
  const { data: classes = initialClasses } = useTeacherExamClasses(trimester)

  const filtered = useMemo(() => {
    if (!search) return classes
    return classes
      .map(cls => ({
        ...cls,
        students: cls.students.filter(s =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
          (s.studentCustomId ?? '').toLowerCase().includes(search.toLowerCase())
        ),
      }))
      .filter(cls => cls.students.length > 0)
  }, [classes, search])

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#fdf6f0] border border-[#f0dcc8] flex items-center justify-center shrink-0">
          <GraduationCap className="h-5 w-5 text-[#c2440f]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#7a4f30]">Noter les étudiants</h1>
          <p className="text-sm text-muted-foreground">
            Soumettre les notes semestrielles pour vos étudiants
          </p>
        </div>
      </div>

      {/* Closed period banner */}
      {!examPeriodOpen && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Période d&apos;examens fermée</p>
            <p className="text-xs text-amber-700 mt-0.5">
              La saisie des notes est désactivée. Contactez l&apos;administrateur pour ouvrir la période d&apos;examens.
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher des étudiants..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
        />
      </div>

      {/* Classes */}
      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-base font-medium text-muted-foreground">Aucune classe assignée</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Vous n&apos;êtes assigné(e) à aucune classe pour le Trimestre {trimester}.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">Aucun étudiant correspondant à &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(cls => (
            <ClassCard key={cls.classId} cls={cls} search={search} examPeriodOpen={examPeriodOpen} />
          ))}
        </div>
      )}
    </div>
  )
}
