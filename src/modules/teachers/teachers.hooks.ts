'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getTeachersAction,
  getTeacherAction,
  inviteTeacherAction,
  updateTeacherAction,
  removeTeacherAction,
} from './teachers.actions'
import type { InviteTeacherInput, UpdateTeacherInput } from './teachers.schema'

export const teachersKeys = {
  all: ['teachers'] as const,
  lists: () => [...teachersKeys.all, 'list'] as const,
  detail: (id: string) => [...teachersKeys.all, 'detail', id] as const,
}

export function useTeachers() {
  return useQuery({
    queryKey: teachersKeys.lists(),
    queryFn: async () => {
      const result = await getTeachersAction()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useTeacher(memberId: string) {
  return useQuery({
    queryKey: teachersKeys.detail(memberId),
    queryFn: async () => {
      const result = await getTeacherAction(memberId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: !!memberId,
  })
}

export function useInviteTeacher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: InviteTeacherInput) => inviteTeacherAction(input),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Invitation envoyée avec succès')
      queryClient.invalidateQueries({ queryKey: teachersKeys.lists() })
    },
    onError: () => toast.error('Une erreur est survenue'),
  })
}

export function useUpdateTeacher(memberId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateTeacherInput) => updateTeacherAction(memberId, input),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Enseignant modifié avec succès')
      queryClient.invalidateQueries({ queryKey: teachersKeys.all })
    },
    onError: () => toast.error('Une erreur est survenue'),
  })
}

export function useRemoveTeacher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (memberId: string) => removeTeacherAction(memberId),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Enseignant retiré de l\'école')
      queryClient.invalidateQueries({ queryKey: teachersKeys.lists() })
    },
    onError: () => toast.error('Une erreur est survenue'),
  })
}
