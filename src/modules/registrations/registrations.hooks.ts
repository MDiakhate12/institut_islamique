'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getRegistrationFormAction,
  updateRegistrationFormAction,
  resetRegistrationFormAction,
  getRegistrationsAction,
  reviewRegistrationAction,
  bulkApproveRegistrationsAction,
} from './registrations.actions'
import type { FormType, FormItem } from './registrations.types'
import type { ReviewRegistrationInput } from './registrations.schema'

export const registrationKeys = {
  form: (formType: FormType) => ['registration-form', formType] as const,
  list: ['registrations'] as const,
}

export function useRegistrations() {
  return useQuery({
    queryKey: registrationKeys.list,
    queryFn: async () => {
      const result = await getRegistrationsAction()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useRegistrationForm(formType: FormType) {
  return useQuery({
    queryKey: registrationKeys.form(formType),
    queryFn: async () => {
      const result = await getRegistrationFormAction(formType)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useUpdateRegistrationForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ formType, schema }: { formType: FormType; schema: FormItem[] }) => {
      const result = await updateRegistrationFormAction(formType, schema)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      qc.setQueryData(registrationKeys.form(data.formType), data)
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useResetRegistrationForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formType: FormType) => {
      const result = await resetRegistrationFormAction(formType)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      qc.setQueryData(registrationKeys.form(data.formType), data)
      toast.success('Formulaire réinitialisé')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useReviewRegistration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReviewRegistrationInput) => reviewRegistrationAction(input),
    onSuccess: (result, vars) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success(vars.status === 'approved' ? 'Inscription approuvée' : 'Inscription rejetée')
      qc.invalidateQueries({ queryKey: registrationKeys.list })
    },
    onError: () => toast.error("Impossible d'enregistrer la décision"),
  })
}

export function useBulkApproveRegistrations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => bulkApproveRegistrationsAction(ids),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      const { approved, skipped } = result.data
      toast.success(`${approved} inscription${approved > 1 ? 's' : ''} approuvée${approved > 1 ? 's' : ''}`
        + (skipped > 0 ? ` (${skipped} déjà traitée${skipped > 1 ? 's' : ''})` : ''))
      qc.invalidateQueries({ queryKey: registrationKeys.list })
    },
    onError: () => toast.error("Impossible d'approuver la sélection"),
  })
}
