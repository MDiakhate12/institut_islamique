'use client'

import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getTeacherExamClassesAction,
  submitExamResultAction,
  getParentChildrenGradesAction,
  signExamGradeAction,
  getAdminExamClassesAction,
  getAdminExamStudentsAction,
} from './exams.actions'
import type { SubmitExamInput } from './exams.schema'
import type { AdminExamClassProgress, AdminExamStudentProgress, TeacherExamClass } from './exams.types'

/** `initialData` : données serveur du trimestre affiché au chargement de la page. */
export function useAdminExamClasses(trimester: number, initialData?: AdminExamClassProgress[]) {
  return useQuery({
    queryKey: ['admin-exam-classes', trimester],
    queryFn: async () => {
      const r = await getAdminExamClassesAction(trimester)
      return r.success ? r.data : []
    },
    initialData,
    // Changement de trimestre : l'ancien reste affiché, atténué, jusqu'à la réponse
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

/** `initialData` : données serveur du trimestre affiché au chargement de la page. */
export function useAdminExamStudents(trimester: number, initialData?: AdminExamStudentProgress[]) {
  return useQuery({
    queryKey: ['admin-exam-students', trimester],
    queryFn: async () => {
      const r = await getAdminExamStudentsAction(trimester)
      return r.success ? r.data : []
    },
    initialData,
    // Changement de trimestre : l'ancien reste affiché, atténué, jusqu'à la réponse
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

/** `initialData` : données serveur du trimestre affiché au chargement de la page. */
export function useTeacherExamClasses(trimester: number, initialData?: TeacherExamClass[]) {
  return useQuery({
    queryKey: ['teacher-exam-classes', trimester],
    queryFn: async () => {
      const r = await getTeacherExamClassesAction(trimester)
      return r.success ? r.data : []
    },
    initialData,
    // Changement de trimestre : l'ancien reste affiché, atténué, jusqu'à la réponse
    placeholderData: keepPreviousData,
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
      return r.success ? r.data : { periodOpen: false, published: false, children: [] }
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
