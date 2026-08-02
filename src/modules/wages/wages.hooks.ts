'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getWageTimesheetAction,
  getWageKpisAction,
  getMyWagesAction,
  getMyWageKpisAction,
  getTeacherOptionsAction,
  getTeacherClassOptionsAction,
  getMyClassOptionsAction,
  logHoursAction,
  logMyHoursAction,
  updateWageStatusAction,
} from './wages.actions'
import type { LogHoursInput, LogMyHoursInput, UpdateWageStatusInput } from './wages.schema'

const timesheetKey = ['wage-timesheet'] as const
const wageKpisKey = ['wage-kpis'] as const
const myWagesKey = ['my-wages'] as const
const myWageKpisKey = ['my-wage-kpis'] as const

export function useWageTimesheet() {
  return useQuery({
    queryKey: timesheetKey,
    queryFn: async () => {
      const r = await getWageTimesheetAction()
      return r.success ? r.data : { rows: [], dates: [], totalHours: 0, totalAmountCents: 0, teacherCount: 0, sessionCount: 0 }
    },
    staleTime: 15_000,
  })
}

export function useWageKpis() {
  return useQuery({
    queryKey: wageKpisKey,
    queryFn: async () => {
      const r = await getWageKpisAction()
      return r.success ? r.data : { approved: 0, pending: 0, paid: 0 }
    },
    staleTime: 15_000,
  })
}

export function useMyWages() {
  return useQuery({
    queryKey: myWagesKey,
    queryFn: async () => {
      const r = await getMyWagesAction()
      return r.success ? r.data : { rows: [], dates: [], totalHours: 0, totalAmountCents: 0, teacherCount: 0, sessionCount: 0 }
    },
    staleTime: 15_000,
  })
}

export function useMyWageKpis() {
  return useQuery({
    queryKey: myWageKpisKey,
    queryFn: async () => {
      const r = await getMyWageKpisAction()
      return r.success ? r.data : { approved: 0, pending: 0, paid: 0 }
    },
    staleTime: 15_000,
  })
}

export function useTeacherOptions(enabled: boolean = true) {
  return useQuery({
    queryKey: ['teacher-options'],
    queryFn: async () => {
      const r = await getTeacherOptionsAction()
      return r.success ? r.data : []
    },
    staleTime: 60_000,
    enabled,
  })
}

export function useTeacherClassOptions(teacherId: string | null) {
  return useQuery({
    queryKey: ['teacher-class-options', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const r = await getTeacherClassOptionsAction(teacherId)
      return r.success ? r.data : []
    },
    enabled: !!teacherId,
  })
}

export function useMyClassOptions(enabled: boolean = true) {
  return useQuery({
    queryKey: ['my-class-options'],
    queryFn: async () => {
      const r = await getMyClassOptionsAction()
      return r.success ? r.data : []
    },
    staleTime: 60_000,
    enabled,
  })
}

function useInvalidateWages() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: timesheetKey })
    qc.invalidateQueries({ queryKey: wageKpisKey })
    qc.invalidateQueries({ queryKey: myWagesKey })
    qc.invalidateQueries({ queryKey: myWageKpisKey })
  }
}

export function useLogHours() {
  const invalidate = useInvalidateWages()
  return useMutation({
    mutationFn: (data: LogHoursInput) => logHoursAction(data),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Heures enregistrées avec succès')
      invalidate()
    },
    onError: () => toast.error("Erreur lors de l'enregistrement des heures"),
  })
}

export function useLogMyHours() {
  const invalidate = useInvalidateWages()
  return useMutation({
    mutationFn: (data: LogMyHoursInput) => logMyHoursAction(data),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Heures enregistrées avec succès')
      invalidate()
    },
    onError: () => toast.error("Erreur lors de l'enregistrement des heures"),
  })
}

export function useUpdateWageStatus() {
  const invalidate = useInvalidateWages()
  return useMutation({
    mutationFn: (data: UpdateWageStatusInput) => updateWageStatusAction(data),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Statut mis à jour')
      invalidate()
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })
}
