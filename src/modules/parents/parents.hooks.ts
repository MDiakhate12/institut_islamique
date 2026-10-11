'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { studentsKeys } from '@/modules/students/students.hooks'
import { saveParentAction, setStudentGuardianAction, removeStudentGuardianAction, getParentDirectoryAction, getParentsAction, sendOtpAction, verifyOtpAndLinkAction, getChildrenAction, unlinkChildAction } from './parents.actions'

export function useParents() {
  return useQuery({
    queryKey: ['parents'],
    queryFn: async () => {
      const result = await getParentsAction()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useChildren() {
  return useQuery({
    queryKey: ['children'],
    queryFn: async () => {
      const result = await getChildrenAction()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (email: string) => sendOtpAction(email),
  })
}

export function useVerifyOtpAndLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      verifyOtpAndLinkAction(email, code),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['children'] })
      }
    },
  })
}

export function useUnlinkChild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentId: string) => unlinkChildAction(studentId),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      queryClient.invalidateQueries({ queryKey: ['children'] })
      toast.success('Enfant délié du compte')
    },
    onError: () => toast.error('Erreur lors de la suppression du lien'),
  })
}

export function useSaveParent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: unknown) => saveParentAction(input),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      queryClient.invalidateQueries({ queryKey: studentsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['parents'] })
      toast.success('Parent enregistré')
    },
    onError: () => toast.error("Impossible d'enregistrer le parent"),
  })
}

/** Annuaire des parents (autocomplétion) — chargé seulement quand `enabled`. */
export function useParentDirectory(enabled: boolean) {
  return useQuery({
    queryKey: ['parents', 'directory'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await getParentDirectoryAction()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useSetStudentGuardian() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, input }: { studentId: string; input: unknown }) => setStudentGuardianAction(studentId, input),
    onSuccess: (result) => {
      if (!result.success) return // l'erreur est affichée par l'appelant
      queryClient.invalidateQueries({ queryKey: studentsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['parents'] })
    },
  })
}

export function useRemoveStudentGuardian() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, guardianId }: { studentId: string; guardianId: string }) => removeStudentGuardianAction(studentId, guardianId),
    onSuccess: (result) => {
      if (!result.success) return // l'erreur est affichée par l'appelant
      queryClient.invalidateQueries({ queryKey: studentsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['parents'] })
    },
  })
}
