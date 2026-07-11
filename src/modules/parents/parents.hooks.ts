'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getParentsAction, sendOtpAction, verifyOtpAndLinkAction, getChildrenAction, unlinkChildAction } from './parents.actions'

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
    mutationFn: (phone: string) => sendOtpAction(phone),
  })
}

export function useVerifyOtpAndLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) =>
      verifyOtpAndLinkAction(phone, code),
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
