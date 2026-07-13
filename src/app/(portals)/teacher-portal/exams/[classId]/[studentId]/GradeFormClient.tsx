'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { submitExamResultAction } from '@/modules/exams/exams.actions'
import type { GradeFormStudent, ExamResult } from '@/modules/exams/exams.types'

interface Props {
  info: GradeFormStudent
  existing: ExamResult | null
  trimester: number
  academicYear: string | null
}

function StarRating({
  label,
  optional,
  value,
  onChange,
}: {
  label: string
  optional?: boolean
  value: number
  onChange: (v: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  const filled = hovered || value

  return (
    <div className="space-y-1.5">
      <p className="text-sm text-gray-700">
        {label}
        {optional && <span className="ml-1.5 text-xs text-muted-foreground">(Optional)</span>}
      </p>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                'h-7 w-7 transition-colors',
                star <= filled ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export function GradeFormClient({ info, existing, trimester, academicYear }: Props) {
  const router = useRouter()
  const isUpdate = !!existing

  const [attendance, setAttendance] = useState(existing?.attendance ?? 0)
  const [respectTeachers, setRespectTeachers] = useState(existing?.respectTeachers ?? 0)
  const [respectOthers, setRespectOthers] = useState(existing?.respectOthers ?? 0)
  const [bringBooks, setBringBooks] = useState(existing?.bringBooks ?? 0)
  const [participation, setParticipation] = useState(existing?.participation ?? 0)
  const [eagerness, setEagerness] = useState(existing?.eagerness ?? 0)
  const [coveredContent, setCoveredContent] = useState(existing?.coveredContent ?? '')
  const [generalComments, setGeneralComments] = useState(existing?.generalComments ?? '')
  const [score, setScore] = useState<string>(existing?.score?.toString() ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const required = [attendance, respectTeachers, respectOthers, participation, eagerness]
    if (required.some(v => v === 0)) {
      toast.error('Veuillez fournir les évaluations pour tous les champs requis')
      return
    }

    setLoading(true)
    const result = await submitExamResultAction({
      classId: info.classId,
      studentId: info.studentId,
      trimester,
      academicYear,
      attendance,
      respectTeachers,
      respectOthers,
      bringBooks: bringBooks || null,
      participation,
      eagerness,
      coveredContent: coveredContent || null,
      generalComments: generalComments || null,
      score: score ? parseInt(score, 10) : null,
    })
    setLoading(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Note soumise avec succès !')
    router.push('/teacher-portal/exams')
    router.refresh()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#c2440f] transition-colors"
      >
        ← Retour aux étudiants
      </button>

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border-2 border-[#c2440f]/40 bg-white overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-[#c2440f]/20">
            <h1 className="text-xl font-bold text-[#7a4f30] text-center">
              Étudiant: {info.firstName} {info.lastName}
            </h1>
          </div>

          <div className="p-6 space-y-6">
            {/* Star ratings grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <StarRating label="Présence :" value={attendance} onChange={setAttendance} />
              <StarRating label="Respect des enseignants :" value={respectTeachers} onChange={setRespectTeachers} />
              <StarRating label="Respect des autres :" value={respectOthers} onChange={setRespectOthers} />
              <StarRating label="Apporter les livres" optional value={bringBooks} onChange={setBringBooks} />
              <StarRating label="Participation :" value={participation} onChange={setParticipation} />
              <StarRating label="Désir d'apprendre :" value={eagerness} onChange={setEagerness} />
            </div>

            {/* Textareas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Ce qui a été couvert ce semestre :</label>
                <textarea
                  value={coveredContent}
                  onChange={e => setCoveredContent(e.target.value)}
                  rows={5}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Commentaires généraux :</label>
                <textarea
                  value={generalComments}
                  onChange={e => setGeneralComments(e.target.value)}
                  rows={5}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
                />
              </div>
            </div>

            {/* Exam score */}
            <div className="space-y-1.5">
              <label className="text-sm text-gray-700">
                Points d&apos;examen (sur 100) :&nbsp;
                <span className="text-muted-foreground">(Optionnel)</span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={e => setScore(e.target.value)}
                className="w-40 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
              />
            </div>

            {/* Submit */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-10 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#7a4f30] hover:bg-[#5c3820] transition-colors disabled:opacity-60"
              >
                {loading ? 'Envoi…' : isUpdate ? 'Mettre à jour la note' : 'Soumettre'}
              </button>
              {isUpdate && (
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-xs text-blue-600">
                  Modification de la note existante
                </span>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
