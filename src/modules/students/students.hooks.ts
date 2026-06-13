'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getStudentsAction,
  createStudentAction,
  updateStudentAction,
  deactivateStudentAction,
} from './students.actions'
import type { CreateStudentInput, UpdateStudentInput } from './students.schema'

export const studentsKeys = {
  all: ['students'] as const,
  lists: () => [...studentsKeys.all, 'list'] as const,
  detail: (id: string) => [...studentsKeys.all, 'detail', id] as const,
}

export function useStudents() {
  return useQuery({
    queryKey: studentsKeys.lists(),
    queryFn: async () => {
      const result = await getStudentsAction()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateStudentInput) => createStudentAction(input),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Élève créé avec succès')
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() })
    },
    onError: () => toast.error('Une erreur est survenue'),
  })
}

export function useUpdateStudent(studentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateStudentInput) => updateStudentAction(studentId, input),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Élève modifié avec succès')
      queryClient.invalidateQueries({ queryKey: studentsKeys.all })
    },
    onError: () => toast.error('Une erreur est survenue'),
  })
}

export function useDeactivateStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (studentId: string) => deactivateStudentAction(studentId),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Élève désactivé')
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() })
    },
    onError: () => toast.error('Une erreur est survenue'),
  })
}
