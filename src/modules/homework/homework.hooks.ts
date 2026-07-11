'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPinnedClassesAction, getClassOptionsAction,
  addPinnedClassAction, removePinnedClassAction,
  getHomeworkByClassAction, createHomeworkAction,
  updateHomeworkAction, deleteHomeworkAction,
  getHomeworkStudentsAction,
  getActiveSessionAction, createVirtualSessionAction, endVirtualSessionAction,
} from './homework.actions'

export const hwKeys = {
  pinnedClasses: () => ['homework', 'pinned-classes'] as const,
  classOptions:  () => ['homework', 'class-options'] as const,
  homework:      (classId: string) => ['homework', 'list', classId] as const,
  students:      (classId: string) => ['homework', 'students', classId] as const,
  session:       (classId: string) => ['homework', 'session', classId] as const,
}

export function usePinnedClasses() {
  return useQuery({
    queryKey: hwKeys.pinnedClasses(),
    queryFn: () => getPinnedClassesAction().then(r => r.success ? r.data : []),
  })
}

export function useClassOptions() {
  return useQuery({
    queryKey: hwKeys.classOptions(),
    queryFn: () => getClassOptionsAction().then(r => r.success ? r.data : []),
  })
}

export function useAddPinnedClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (classId: string) => addPinnedClassAction(classId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hwKeys.pinnedClasses() })
      qc.invalidateQueries({ queryKey: hwKeys.classOptions() })
    },
  })
}

export function useRemovePinnedClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pinnedId: string) => removePinnedClassAction(pinnedId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hwKeys.pinnedClasses() })
      qc.invalidateQueries({ queryKey: hwKeys.classOptions() })
    },
  })
}

export function useHomework(classId: string) {
  return useQuery({
    queryKey: hwKeys.homework(classId),
    queryFn: () => getHomeworkByClassAction(classId).then(r => r.success ? r.data : []),
    enabled: !!classId,
  })
}

export function useCreateHomework() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: unknown) => createHomeworkAction(input),
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: hwKeys.homework(vars.classId) })
      qc.invalidateQueries({ queryKey: hwKeys.pinnedClasses() })
    },
  })
}

export function useUpdateHomework(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: unknown }) =>
      updateHomeworkAction(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: hwKeys.homework(classId) }),
  })
}

export function useDeleteHomework(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteHomeworkAction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hwKeys.homework(classId) })
      qc.invalidateQueries({ queryKey: hwKeys.pinnedClasses() })
    },
  })
}

export function useHomeworkStudents(classId: string) {
  return useQuery({
    queryKey: hwKeys.students(classId),
    queryFn: () => getHomeworkStudentsAction(classId).then(r => r.success ? r.data : []),
    enabled: !!classId,
  })
}

export function useActiveSession(classId: string) {
  return useQuery({
    queryKey: hwKeys.session(classId),
    queryFn: () => getActiveSessionAction(classId).then(r => r.success ? r.data : null),
    enabled: !!classId,
  })
}

export function useCreateVirtualSession(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => createVirtualSessionAction(classId),
    onSuccess: () => qc.invalidateQueries({ queryKey: hwKeys.session(classId) }),
  })
}

export function useEndVirtualSession(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => endVirtualSessionAction(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: hwKeys.session(classId) }),
  })
}
