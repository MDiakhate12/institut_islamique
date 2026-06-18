'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getRegistrationFormAction,
  updateRegistrationFormAction,
  resetRegistrationFormAction,
} from './registrations.actions'
import type { FormType, FormItem } from './registrations.types'

export const registrationKeys = {
  form: (formType: FormType) => ['registration-form', formType] as const,
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
