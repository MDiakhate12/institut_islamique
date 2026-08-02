'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getExpensesAction,
  getExpenseKpisAction,
  getMyExpensesAction,
  getMyExpenseKpisAction,
  createExpenseAction,
  approveExpenseAction,
  rejectExpenseAction,
  markExpensePaidAction,
} from './expenses.actions'
import type { CreateExpenseInput } from './expenses.schema'

const expensesKey = ['expenses'] as const
const expenseKpisKey = ['expense-kpis'] as const
const myExpensesKey = ['my-expenses'] as const
const myExpenseKpisKey = ['my-expense-kpis'] as const

export function useExpenses() {
  return useQuery({
    queryKey: expensesKey,
    queryFn: async () => {
      const r = await getExpensesAction()
      return r.success ? r.data : []
    },
    staleTime: 15_000,
  })
}

export function useExpenseKpis() {
  return useQuery({
    queryKey: expenseKpisKey,
    queryFn: async () => {
      const r = await getExpenseKpisAction()
      return r.success ? r.data : { approved: 0, pending: 0, paid: 0 }
    },
    staleTime: 15_000,
  })
}

export function useMyExpenses() {
  return useQuery({
    queryKey: myExpensesKey,
    queryFn: async () => {
      const r = await getMyExpensesAction()
      return r.success ? r.data : []
    },
    staleTime: 15_000,
  })
}

export function useMyExpenseKpis() {
  return useQuery({
    queryKey: myExpenseKpisKey,
    queryFn: async () => {
      const r = await getMyExpenseKpisAction()
      return r.success ? r.data : { approved: 0, pending: 0, paid: 0 }
    },
    staleTime: 15_000,
  })
}

function useInvalidateExpenses() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: expensesKey })
    qc.invalidateQueries({ queryKey: expenseKpisKey })
    qc.invalidateQueries({ queryKey: myExpensesKey })
    qc.invalidateQueries({ queryKey: myExpenseKpisKey })
  }
}

export function useCreateExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({
    mutationFn: (data: CreateExpenseInput) => createExpenseAction(data),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Demande de remboursement soumise avec succès')
      invalidate()
    },
    onError: () => toast.error('Erreur lors de la soumission'),
  })
}

export function useApproveExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({
    mutationFn: (id: string) => approveExpenseAction(id),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Remboursement approuvé avec succès')
      invalidate()
    },
    onError: () => toast.error("Erreur lors de l'approbation"),
  })
}

export function useRejectExpense() {
  const invalidate = useInvalidateExpenses()
  return useMutation({
    mutationFn: (id: string) => rejectExpenseAction(id),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Remboursement rejeté')
      invalidate()
    },
    onError: () => toast.error('Erreur lors du rejet'),
  })
}

export function useMarkExpensePaid() {
  const invalidate = useInvalidateExpenses()
  return useMutation({
    mutationFn: (id: string) => markExpensePaidAction(id),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Remboursement marqué comme payé')
      invalidate()
    },
    onError: () => toast.error('Erreur lors du marquage comme payé'),
  })
}
