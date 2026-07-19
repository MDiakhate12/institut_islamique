'use client'

import { useState } from 'react'
import { GraduationCap, Star, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useParentChildrenGrades, useSignExamGrade } from '@/modules/exams/exams.hooks'
import type { ParentChildExamData, ParentExamGrade } from '@/modules/exams/exams.types'

interface Props {
  initialChildren: ParentChildExamData[]
  initialTrimester: number
  academicYear: string
  parentName: string
}

function StarDisplay({ value }: { value: number | null }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={cn(
            'h-5 w-5',
            value !== null && star <= value
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200',
          )}
        />
      ))}
    </div>
  )
}

const STAR_LABELS = [
  { key: 'attendance' as const, label: 'Présence' },
  { key: 'respectTeachers' as const, label: 'Respect des enseignants' },
  { key: 'respectOthers' as const, label: 'Respect des autres' },
  { key: 'participation' as const, label: 'Participation' },
  { key: 'eagerness' as const, label: 'Envie d\'apprendre' },
  { key: 'bringBooks' as const, label: 'Performance académique' },
]

function GradeCard({ grade, parentName }: { grade: ParentExamGrade; parentName: string }) {
  const { mutate: sign, isPending } = useSignExamGrade()

  return (
    <div className="rounded-xl border-2 border-[#c2440f]/30 bg-white overflow-hidden">
      {/* Class header */}
      <div className="px-5 py-4 border-b border-[#c2440f]/10">
        <p className="font-semibold text-[#7a4f30]">{grade.className}</p>
        {grade.teacherName && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
            <User className="h-3.5 w-3.5" />
            <span>Enseignant : {grade.teacherName}</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Star ratings */}
        <div className="space-y-3">
          {STAR_LABELS.map(({ key, label }) => {
            const val = grade[key]
            if (val === null && key === 'bringBooks') return null
            return (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">{label} :</span>
                <StarDisplay value={val} />
              </div>
            )
          })}
        </div>

        {/* Covered content */}
        {grade.coveredContent && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">Ce qui a été couvert ce semestre :</p>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
              {grade.coveredContent}
            </div>
          </div>
        )}

        {/* General comments */}
        {grade.generalComments && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">Commentaires généraux :</p>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
              {grade.generalComments}
            </div>
          </div>
        )}

        {/* Exam points */}
        {grade.score !== null && (
          <p className="text-sm text-gray-700">
            Points d&apos;examen :{' '}
            <span className="text-xl font-bold text-[#c2440f]">{grade.score}/100</span>
          </p>
        )}

        {/* Parent signature */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-700">Signature du parent :</span>
          {grade.parentSignature ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
              {grade.parentSignature}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
          ) : (
            <button
              onClick={() => sign({ examResultId: grade.examResultId, parentSignature: parentName })}
              disabled={isPending}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-[#7a4f30] hover:bg-[#5c3820] transition-colors disabled:opacity-60"
            >
              {isPending ? 'Envoi…' : 'Signer avec mon nom'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ChildGrades({ child, parentName }: { child: ParentChildExamData; parentName: string }) {
  if (child.grades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GraduationCap className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Aucune note disponible</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Les bulletins seront visibles une fois que l&apos;enseignant aura soumis ses notes.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {child.grades.map(grade => (
        <GradeCard key={grade.classId} grade={grade} parentName={parentName} />
      ))}
    </div>
  )
}

export function ExamsClient({ initialChildren, initialTrimester, academicYear, parentName }: Props) {
  const [trimester, setTrimester] = useState(initialTrimester)
  const { data: children = initialChildren } = useParentChildrenGrades(trimester)
  const [activeId, setActiveId] = useState(initialChildren[0]?.studentId ?? '')

  const activeChild = children.find(c => c.studentId === activeId) ?? children[0]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#fdf6f0] border border-[#f0dcc8] flex items-center justify-center shrink-0">
          <GraduationCap className="h-5 w-5 text-[#c2440f]" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#7a4f30]">
            Bulletins scolaires
          </h1>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {academicYear} — Consulter les notes et signer
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map(t => (
                <button
                  key={t}
                  onClick={() => setTrimester(t)}
                  className={cn(
                    'px-2.5 py-0.5 text-xs font-semibold rounded-full transition-colors',
                    trimester === t
                      ? 'bg-[#c2440f] text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50',
                  )}
                >
                  T{t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {children.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-base font-medium text-muted-foreground">Aucun enfant lié</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Liez votre compte à vos enfants pour voir leurs bulletins.
          </p>
        </div>
      ) : (
        <>
          {/* Child selector */}
          {children.length > 1 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Sélectionner un enfant :</p>
              <div className="flex gap-2 flex-wrap">
                {children.map(child => (
                  <button
                    key={child.studentId}
                    onClick={() => setActiveId(child.studentId)}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                      activeId === child.studentId
                        ? 'bg-[#c2440f] text-white'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {child.firstName} {child.lastName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Student name */}
          {activeChild && (
            <>
              <h2 className="text-lg font-bold text-[#7a4f30]">
                Élève : {activeChild.firstName} {activeChild.lastName}
              </h2>
              <ChildGrades child={activeChild} parentName={parentName} />
            </>
          )}
        </>
      )}
    </div>
  )
}
