'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getStudentsAction,
  createStudentAction,
  updateStudentAction,
  deactivateStudentAction,
  updateStudentNoteAction,
  getStudentPaymentsAction,
  getStudentAttendanceCalendarAction,
  getStudentHomeworkAction,
  getActiveClassesAction,
  getStudentReportCardAction,
} from './students.actions'
import type { CreateStudentInput, UpdateStudentInput } from './students.schema'

export const studentsKeys = {
  all:         ['students'] as const,
  lists:       () => [...studentsKeys.all, 'list'] as const,
  detail:      (id: string) => [...studentsKeys.all, 'detail', id] as const,
  payments:    (id: string) => [...studentsKeys.all, 'payments', id] as const,
  attendance:  (id: string) => [...studentsKeys.all, 'attendance', id] as const,
  homework:    (id: string) => [...studentsKeys.all, 'homework', id] as const,
  reportCard:  (id: string) => [...studentsKeys.all, 'report-card', id] as const,
  classes:     () => [...studentsKeys.all, 'active-classes'] as const,
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
      if (!result.success) { toast.error(result.error); return }
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
      if (!result.success) { toast.error(result.error); return }
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
      if (!result.success) { toast.error(result.error); return }
      toast.success('Élève désactivé')
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() })
    },
    onError: () => toast.error('Une erreur est survenue'),
  })
}

export function useUpdateStudentNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, note }: { studentId: string; note: string }) =>
      updateStudentNoteAction(studentId, note),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() })
    },
    onError: () => toast.error('Impossible de sauvegarder le commentaire'),
  })
}

export function useStudentPayments(studentId: string, enabled = false) {
  return useQuery({
    queryKey: studentsKeys.payments(studentId),
    enabled,
    queryFn: async () => {
      const result = await getStudentPaymentsAction(studentId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useStudentAttendanceCalendar(studentId: string, enabled = false) {
  return useQuery({
    queryKey: studentsKeys.attendance(studentId),
    enabled,
    queryFn: async () => {
      const result = await getStudentAttendanceCalendarAction(studentId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useStudentHomework(studentId: string, enabled = false) {
  return useQuery({
    queryKey: studentsKeys.homework(studentId),
    enabled,
    queryFn: async () => {
      const result = await getStudentHomeworkAction(studentId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useStudentReportCard(studentId: string, enabled = false) {
  return useQuery({
    queryKey: studentsKeys.reportCard(studentId),
    enabled,
    queryFn: async () => {
      const result = await getStudentReportCardAction(studentId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useActiveClasses() {
  return useQuery({
    queryKey: studentsKeys.classes(),
    queryFn: async () => {
      const result = await getActiveClassesAction()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}
