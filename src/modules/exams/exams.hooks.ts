'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getTeacherExamClassesAction,
  submitExamResultAction,
  getParentChildrenGradesAction,
  signExamGradeAction,
} from './exams.actions'
import type { SubmitExamInput } from './exams.schema'

export function useTeacherExamClasses(trimester: number) {
  return useQuery({
    queryKey: ['teacher-exam-classes', trimester],
    queryFn: async () => {
      const r = await getTeacherExamClassesAction(trimester)
      return r.success ? r.data : []
    },
    staleTime: 30_000,
  })
}

export function useSubmitExamResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SubmitExamInput) => submitExamResultAction(data),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Note soumise avec succès !')
      qc.invalidateQueries({ queryKey: ['teacher-exam-classes'] })
    },
    onError: () => toast.error('Erreur lors de la soumission'),
  })
}

export function useParentChildrenGrades(trimester: number) {
  return useQuery({
    queryKey: ['parent-exam-grades', trimester],
    queryFn: async () => {
      const r = await getParentChildrenGradesAction(trimester)
      return r.success ? r.data : []
    },
    staleTime: 30_000,
  })
}

export function useSignExamGrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ examResultId, parentSignature }: { examResultId: string; parentSignature: string }) =>
      signExamGradeAction(examResultId, parentSignature),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Signature ajoutée avec succès !')
      qc.invalidateQueries({ queryKey: ['parent-exam-grades'] })
    },
    onError: () => toast.error('Erreur lors de la signature'),
  })
}
