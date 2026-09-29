'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getClassesAction,
  createClassAction,
  updateClassAction,
  deleteClassAction,
  getClassEnrollmentsAction,
  enrollStudentAction,
  unenrollStudentAction,
  transferStudentAction,
  getAvailableStudentsAction,
  getDistinctRoomsAction,
} from './classes.actions'
import type { CreateClassInput, UpdateClassInput } from './classes.schema'

export const classKeys = {
  all:         ['classes'] as const,
  lists:       () => [...classKeys.all, 'list'] as const,
  enrollments: (classId: string) => [...classKeys.all, 'enrollments', classId] as const,
  available:   (classId: string) => [...classKeys.all, 'available', classId] as const,
  rooms:       () => [...classKeys.all, 'rooms'] as const,
}

export function useClasses() {
  return useQuery({
    queryKey: classKeys.lists(),
    queryFn: async () => {
      const result = await getClassesAction()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useClassEnrollments(classId: string | null) {
  return useQuery({
    queryKey: classKeys.enrollments(classId ?? ''),
    queryFn: async () => {
      const result = await getClassEnrollmentsAction(classId!)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!classId,
  })
}

export function useAvailableStudents(classId: string | null) {
  return useQuery({
    queryKey: classKeys.available(classId ?? ''),
    queryFn: async () => {
      const result = await getAvailableStudentsAction(classId!)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!classId,
  })
}

export function useDistinctRooms() {
  return useQuery({
    queryKey: classKeys.rooms(),
    queryFn: async () => {
      const result = await getDistinctRoomsAction()
      if (!result.success) return []
      return result.data
    },
  })
}

export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClassInput) => createClassAction(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: classKeys.lists() }),
  })
}

export function useUpdateClass(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateClassInput) => updateClassAction(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: classKeys.lists() }),
  })
}

export function useDeleteClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClassAction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: classKeys.lists() }),
  })
}

export function useEnrollStudent(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (studentId: string) => enrollStudentAction(classId, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.enrollments(classId) })
      qc.invalidateQueries({ queryKey: classKeys.available(classId) })
      qc.invalidateQueries({ queryKey: classKeys.lists() })
    },
  })
}

export function useUnenrollStudent(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enrollmentId: string) => unenrollStudentAction(enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.enrollments(classId) })
      qc.invalidateQueries({ queryKey: classKeys.available(classId) })
      qc.invalidateQueries({ queryKey: classKeys.lists() })
    },
  })
}

export function useTransferStudent(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ enrollmentId, newClassId }: { enrollmentId: string; newClassId: string }) =>
      transferStudentAction(enrollmentId, newClassId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.enrollments(classId) })
      qc.invalidateQueries({ queryKey: classKeys.lists() })
    },
  })
}
