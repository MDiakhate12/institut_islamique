'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getPaymentsAction,
  getPaymentKpisAction,
  createPaymentAction,
  updatePaymentAction,
  deletePaymentAction,
  verifyPaymentAction,
  rejectPaymentAction,
  createParentPaymentAction,
  getChildrenPaymentStatusAction,
  remindUnpaidParentsAction,
} from './payments.actions'
import type { CreatePaymentInput, CreateParentPaymentInput } from './payments.schema'

const paymentsKey = ['payments'] as const
const kpisKey = ['payment-kpis'] as const
const childrenStatusKey = ['children-payment-status'] as const

export function usePayments() {
  return useQuery({
    queryKey: paymentsKey,
    queryFn: async () => {
      const r = await getPaymentsAction()
      return r.success ? r.data : []
    },
    staleTime: 15_000,
  })
}

export function usePaymentKpis() {
  return useQuery({
    queryKey: kpisKey,
    queryFn: async () => {
      const r = await getPaymentKpisAction()
      return r.success ? r.data : { totalRevenue: 0, pendingVerification: 0 }
    },
    staleTime: 15_000,
  })
}

function useInvalidatePayments() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: paymentsKey })
    qc.invalidateQueries({ queryKey: kpisKey })
  }
}

export function useCreatePayment() {
  const invalidate = useInvalidatePayments()
  return useMutation({
    mutationFn: (data: CreatePaymentInput) => createPaymentAction(data),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Paiement enregistré avec succès !')
      invalidate()
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  })
}

export function useUpdatePayment() {
  const invalidate = useInvalidatePayments()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePaymentInput }) => updatePaymentAction(id, data),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Paiement modifié avec succès !')
      invalidate()
    },
    onError: () => toast.error('Erreur lors de la modification'),
  })
}

export function useDeletePayment() {
  const invalidate = useInvalidatePayments()
  return useMutation({
    mutationFn: (id: string) => deletePaymentAction(id),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Paiement supprimé')
      invalidate()
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })
}

export function useVerifyPayment() {
  const invalidate = useInvalidatePayments()
  return useMutation({
    mutationFn: (id: string) => verifyPaymentAction(id),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Paiement vérifié')
      invalidate()
    },
    onError: () => toast.error('Erreur lors de la vérification'),
  })
}

export function useRejectPayment() {
  const invalidate = useInvalidatePayments()
  return useMutation({
    mutationFn: (id: string) => rejectPaymentAction(id),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Paiement rejeté')
      invalidate()
    },
    onError: () => toast.error('Erreur lors du rejet'),
  })
}

export function useChildrenPaymentStatus() {
  return useQuery({
    queryKey: childrenStatusKey,
    queryFn: async () => {
      const r = await getChildrenPaymentStatusAction()
      return r.success ? r.data : []
    },
    staleTime: 15_000,
  })
}

export function useCreateParentPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateParentPaymentInput) => createParentPaymentAction(data),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Paiement soumis pour vérification')
      qc.invalidateQueries({ queryKey: childrenStatusKey })
    },
    onError: () => toast.error("Erreur lors de l'envoi du paiement"),
  })
}

export function useRemindUnpaidParents() {
  return useMutation({
    mutationFn: (period: string) => remindUnpaidParentsAction(period),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success(
        `Rappels de paiement envoyés à ${result.data.parentsNotified} parent(s) pour ${result.data.studentsCount} étudiant(s)`
      )
    },
    onError: () => toast.error("Erreur lors de l'envoi des rappels"),
  })
}
