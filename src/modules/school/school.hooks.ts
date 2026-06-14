'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getSchoolAction,
  updateSchoolInfoAction,
  updateSchoolSettingsAction,
  uploadSchoolLogoAction,
} from './school.actions'
import type { UpdateSchoolInfoInput, UpdateSchoolSettingsInput } from './school.schema'

export const schoolKeys = {
  all:    () => ['school'] as const,
  detail: () => ['school', 'detail'] as const,
}

export function useSchool() {
  return useQuery({
    queryKey: schoolKeys.detail(),
    queryFn:  async () => {
      const result = await getSchoolAction()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 60_000,
  })
}

export function useUpdateSchoolInfo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateSchoolInfoInput) => updateSchoolInfoAction(input),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: schoolKeys.detail() })
      toast.success('Informations mises à jour')
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })
}

export function useUpdateSchoolSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateSchoolSettingsInput) => updateSchoolSettingsAction(input),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: schoolKeys.detail() })
      toast.success('Paramètres sauvegardés')
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })
}

export function useUploadSchoolLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ base64, fileName }: { base64: string; fileName: string }) =>
      uploadSchoolLogoAction(base64, fileName),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: schoolKeys.detail() })
      toast.success('Logo mis à jour')
    },
    onError: () => toast.error('Erreur lors du téléversement'),
  })
}
