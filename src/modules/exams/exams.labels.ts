import type { ExamResult } from './exams.types'

type CriterionKey = keyof Pick<
  ExamResult,
  'attendance' | 'respectTeachers' | 'respectOthers' | 'bringBooks' | 'participation' | 'eagerness'
>

/**
 * Critères notés en étoiles, partagés par le formulaire enseignant et le bulletin parent —
 * ne pas redéfinir les libellés localement (le parent voyait « Performance académique »
 * pour ce que l'enseignant notait « Apporter les livres »).
 */
export const EXAM_CRITERIA: { key: CriterionKey; label: string; optional?: boolean }[] = [
  { key: 'attendance',      label: 'Présence' },
  { key: 'respectTeachers', label: 'Respect des enseignants' },
  { key: 'respectOthers',   label: 'Respect des autres' },
  { key: 'bringBooks',      label: 'Apporter les livres', optional: true },
  { key: 'participation',   label: 'Participation' },
  { key: 'eagerness',       label: "Désir d'apprendre" },
]
