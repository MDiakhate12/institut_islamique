'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useSubmitExamResult } from '@/modules/exams/exams.hooks'
import { EXAM_CRITERIA } from '@/modules/exams/exams.labels'
import type { GradeFormStudent, ExamResult } from '@/modules/exams/exams.types'

interface Props {
  info: GradeFormStudent
  existing: ExamResult | null
  trimester: number
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
        {optional && <span className="ml-1.5 text-xs text-muted-foreground">(Optionnel)</span>}
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

export function GradeFormClient({ info, existing, trimester }: Props) {
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
  const submit = useSubmitExamResult()
  const ratings = { attendance, respectTeachers, respectOthers, bringBooks, participation, eagerness }
  const ratingSetters = {
    attendance: setAttendance, respectTeachers: setRespectTeachers, respectOthers: setRespectOthers,
    bringBooks: setBringBooks, participation: setParticipation, eagerness: setEagerness,
  }
  const loading = submit.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const required = [attendance, respectTeachers, respectOthers, participation, eagerness]
    if (required.some(v => v === 0)) {
      toast.error('Veuillez fournir les évaluations pour tous les champs requis')
      return
    }

    // Via le hook (et non l'action directement) : il invalide ['teacher-exam-classes'],
    // sinon la liste affichait encore « Non noté » pendant le staleTime (30 s) au retour
    const result = await submit.mutateAsync({
      classId: info.classId,
      studentId: info.studentId,
      trimester,
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
    if (!result.success) return // toast d'erreur affiché par le hook

    // Pas de router.refresh() ici : lancé juste après push, il annulait parfois la navigation
    router.push('/teacher-portal/exams')
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#2d6a4f] transition-colors"
      >
        ← Retour aux étudiants
      </button>

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border-2 border-[#2d6a4f]/40 bg-white overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-[#2d6a4f]/20">
            <h1 className="text-xl font-bold text-[#2d6a4f] text-center">
              Étudiant: {info.firstName} {info.lastName}
            </h1>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {/* Star ratings grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {EXAM_CRITERIA.map(({ key, label, optional }) => (
                <StarRating
                  key={key}
                  label={`${label} :`}
                  optional={optional}
                  value={ratings[key]}
                  onChange={v => ratingSetters[key](v)}
                />
              ))}
            </div>

            {/* Textareas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Ce qui a été couvert ce semestre :</label>
                <textarea
                  value={coveredContent}
                  onChange={e => setCoveredContent(e.target.value)}
                  rows={5}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Commentaires généraux :</label>
                <textarea
                  value={generalComments}
                  onChange={e => setGeneralComments(e.target.value)}
                  rows={5}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f]"
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
                className="w-40 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f]"
              />
            </div>

            {/* Submit */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-10 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#2d6a4f] hover:bg-[#1e4535] transition-colors disabled:opacity-60"
              >
                {loading ? 'Envoi…' : isUpdate ? 'Mettre à jour la note' : 'Soumettre'}
              </button>
              {isUpdate && (
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-xs text-blue-600">
                  Modification de la note existante
                </span>
              )}
              {existing?.parentSignature && (
                <p className="text-xs text-amber-700 text-center">
                  Bulletin déjà signé par {existing.parentSignature} : toute modification annulera la signature,
                  le parent devra signer à nouveau.
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
