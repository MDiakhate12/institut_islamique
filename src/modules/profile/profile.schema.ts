import { z } from 'zod'
import { PORTAL_ROLES } from '@/lib/constants'

export const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'Le nom complet est requis'),
  phone: z.string().optional(),
  roles: z.array(z.enum(PORTAL_ROLES)).min(1, 'Vous devez conserver au moins un rôle actif'),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const updateLanguageSchema = z.object({
  preferredLanguage: z.string().nullable(),
})
export type UpdateLanguageInput = z.infer<typeof updateLanguageSchema>

export const changeEmailSchema = z.object({
  newEmail: z.string().email('E-mail invalide'),
  currentPassword: z.string().min(1, 'Mot de passe requis'),
})
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe requis'),
    newPassword: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe requis'),
})
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
