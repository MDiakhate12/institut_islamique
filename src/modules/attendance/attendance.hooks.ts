'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPinnedAttendanceClassesAction, getAttendanceClassOptionsAction,
  addPinnedAttendanceClassAction, removePinnedAttendanceClassAction,
  getAttendanceStudentsAction, getExistingAttendanceAction,
  submitAttendanceAction, getAdminDayOverviewAction,
} from './attendance.actions'
import type { SubmitAttendanceInput } from './attendance.types'

export const attKeys = {
  pinnedClasses: () => ['attendance', 'pinned-classes'] as const,
  classOptions:  () => ['attendance', 'class-options'] as const,
  students:      (classId: string) => ['attendance', 'students', classId] as const,
  existing:      (classId: string, date: string) => ['attendance', 'existing', classId, date] as const,
  adminDay:      (date: string) => ['attendance', 'admin-day', date] as const,
}

export function usePinnedAttendanceClasses() {
  return useQuery({
    queryKey: attKeys.pinnedClasses(),
    queryFn: () => getPinnedAttendanceClassesAction().then(r => r.success ? r.data : []),
  })
}

export function useAttendanceClassOptions() {
  return useQuery({
    queryKey: attKeys.classOptions(),
    queryFn: () => getAttendanceClassOptionsAction().then(r => r.success ? r.data : []),
  })
}

export function useAddPinnedAttendanceClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (classId: string) => addPinnedAttendanceClassAction(classId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attKeys.pinnedClasses() })
      qc.invalidateQueries({ queryKey: attKeys.classOptions() })
    },
  })
}

export function useRemovePinnedAttendanceClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pinnedId: string) => removePinnedAttendanceClassAction(pinnedId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attKeys.pinnedClasses() })
      qc.invalidateQueries({ queryKey: attKeys.classOptions() })
    },
  })
}

export function useAttendanceStudents(classId: string) {
  return useQuery({
    queryKey: attKeys.students(classId),
    queryFn: () => getAttendanceStudentsAction(classId).then(r => r.success ? r.data : []),
    enabled: !!classId,
  })
}

export function useExistingAttendance(classId: string, date: string) {
  return useQuery({
    queryKey: attKeys.existing(classId, date),
    queryFn: () => getExistingAttendanceAction(classId, date).then(r => r.success ? r.data : null),
    enabled: !!classId && !!date,
  })
}

export function useSubmitAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SubmitAttendanceInput) => submitAttendanceAction(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: attKeys.existing(vars.classId, vars.date) })
    },
  })
}

export function useAdminDayOverview(date: string) {
  return useQuery({
    queryKey: attKeys.adminDay(date),
    queryFn:  () => getAdminDayOverviewAction(date).then(r => r.success ? r.data : null),
    enabled:  !!date,
  })
}

export function useAdminSubmitAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SubmitAttendanceInput) => submitAttendanceAction(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['attendance', 'admin-day'] })
      qc.invalidateQueries({ queryKey: attKeys.existing(vars.classId, vars.date) })
    },
  })
}
