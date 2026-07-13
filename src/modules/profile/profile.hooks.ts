'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getProfileAction, updateProfileAction, updateLanguageAction,
  changeEmailAction, changePasswordAction, deleteAccountAction,
  saveGeminiApiKeyAction,
} from './profile.actions'
import type { UpdateProfileInput, UpdateLanguageInput, ChangeEmailInput, ChangePasswordInput, DeleteAccountInput } from './profile.schema'

export const profileKeys = {
  all:    () => ['profile'] as const,
  detail: () => ['profile', 'detail'] as const,
}

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.detail(),
    queryFn: async () => {
      const result = await getProfileAction()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfileAction(input),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: profileKeys.detail() })
      toast.success('Profil mis à jour')
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })
}

export function useUpdateLanguage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateLanguageInput) => updateLanguageAction(input),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: profileKeys.detail() })
      toast.success('Langue mise à jour')
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })
}

export function useChangeEmail() {
  return useMutation({
    mutationFn: (input: ChangeEmailInput) => changeEmailAction(input),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Un lien de vérification a été envoyé à votre nouvelle adresse e-mail')
    },
    onError: () => toast.error("Erreur lors du changement d'e-mail"),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePasswordAction(input),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Mot de passe mis à jour')
    },
    onError: () => toast.error('Erreur lors du changement de mot de passe'),
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (input: DeleteAccountInput) => deleteAccountAction(input),
    onError: () => toast.error('Erreur lors de la suppression du compte'),
  })
}

export function useSaveGeminiApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => saveGeminiApiKeyAction(key),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: profileKeys.detail() })
      toast.success('Clé API sauvegardée')
    },
    onError: () => toast.error('Erreur lors de la sauvegarde de la clé API'),
  })
}
