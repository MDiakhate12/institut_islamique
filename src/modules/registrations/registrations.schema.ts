import { z } from 'zod'
import type { FormField, FormItem, SystemFieldKey, RegistrationGuardianInput } from './registrations.types'

export const formTypeSchema = z.enum(['new_student', 'reenrollment'])

export const updateFormSchemaSchema = z.object({
  formType: formTypeSchema,
  formSchema: z.array(z.unknown()), // validated as FormItem[] at runtime
})

export type UpdateFormSchemaInput = z.infer<typeof updateFormSchemaSchema>

// ── Champs requis du formulaire d'inscription ─────────────────────────────────
// Partagé entre le client (PublicRegistrationForm, messages inline) et le serveur
// (submitRegistrationAction, garantie finale) — même règle des deux côtés.

type RequiredFieldsContext = {
  /** settings.gradeLevels — options du champ système "schoolGrade" */
  gradeOptions?: string[]
  /** settings.financialOptions — options du champ système "financialAid" */
  financialOptions?: string[]
  /** Champs système non affichés (remplacés par le bloc « Tuteurs » du portail parent) */
  skipFieldKeys?: SystemFieldKey[]
}

function fieldOptions(field: FormField, ctx: RequiredFieldsContext): string[] {
  if (field.kind === 'system_field' && field.fieldKey === 'schoolGrade') return ctx.gradeOptions ?? []
  if (field.kind === 'system_field' && field.fieldKey === 'financialAid') return ctx.financialOptions ?? []
  return field.options ?? []
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return true // case non cochée
  if (typeof value === 'string') return value.trim() === ''
  if (typeof value === 'number') return value === 0 || Number.isNaN(value) // note 0 = pas de note
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** Champs marqués requis (*) mais non remplis, dans l'ordre du formulaire. */
export function getMissingRequiredFields(
  schema: FormItem[],
  formData: Record<string, unknown>,
  ctx: RequiredFieldsContext = {},
): FormField[] {
  const missing: FormField[] = []
  for (const item of schema) {
    // La sélection de classe n'a pas de champs rendus (cartes class_<matière>)
    if (item.kind !== 'section' || item.systemKey === 'class_selection') continue
    for (const field of item.fields) {
      if (!field.required) continue
      if (field.kind === 'system_field' && field.readOnly) continue
      if (field.kind === 'system_field' && ctx.skipFieldKeys?.includes(field.fieldKey)) continue
      // Oui/Non : non coché = « non », une réponse valide
      if (field.type === 'yes_no') continue
      // Champ à choix sans aucune option configurée par l'école : impossible à remplir, on ne bloque pas
      if (['select', 'radio', 'multiple'].includes(field.type) && fieldOptions(field, ctx).length === 0) continue
      if (isEmptyValue(formData[field.id])) missing.push(field)
    }
  }
  return missing
}

export const reviewRegistrationSchema = z.object({
  registrationId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  notes: z.string().trim().max(1000).nullable(),
})
export type ReviewRegistrationInput = z.infer<typeof reviewRegistrationSchema>

// ── Bloc « Tuteurs » (portail parent) ─────────────────────────────────────────

export const registrationGuardianSchema = z.object({
  relationship: z.enum(['father', 'mother', 'guardian', 'other', '']),
  name:           z.string().trim().max(200),
  phone:          z.string().trim().max(40),
  email:          z.string().trim().max(200),
  emergencyPhone: z.string().trim().max(40),
})
export const registrationGuardiansSchema = z.array(registrationGuardianSchema).min(1).max(2)

/**
 * Erreurs du bloc « Tuteurs », clé `<index>.<champ>` → message. Même règle côté client et serveur :
 * relation obligatoire, un seul père et une seule mère ; tuteur 1 (le parent connecté) : nom et
 * téléphone obligatoires ; tuteur 2 (optionnel) : nom obligatoire s'il est ajouté.
 */
export function getGuardianErrors(
  guardians: RegistrationGuardianInput[],
  // Formulaire public : l'e-mail du tuteur principal est obligatoire (contact de l'école,
  // décision envoyée par e-mail). Portail parent : c'est celui du compte, toujours présent.
  opts: { accountHolder: boolean } = { accountHolder: true },
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (guardians.length === 0) errors['0.name'] = 'Renseignez au moins un tuteur'
  guardians.forEach((g, i) => {
    if (!g.relationship) errors[`${i}.relationship`] = 'Choisissez la relation avec l\'élève'
    if (!g.name.trim()) errors[`${i}.name`] = 'Ce champ est requis'
    if (i === 0 && !g.phone.trim()) errors[`${i}.phone`] = 'Ce champ est requis'
    if (i === 0 && !opts.accountHolder && !g.email.trim()) errors[`${i}.email`] = 'Ce champ est requis'
    if (g.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email.trim())) errors[`${i}.email`] = 'E-mail invalide'
  })
  for (const rel of ['father', 'mother'] as const) {
    const idx = guardians.map((g, i) => (g.relationship === rel ? i : -1)).filter(i => i >= 0)
    if (idx.length > 1) errors[`${idx[1]}.relationship`] = rel === 'father' ? 'Il y a déjà un père' : 'Il y a déjà une mère'
  }
  return errors
}
