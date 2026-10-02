import { z } from 'zod'
import type { FormField, FormItem } from './registrations.types'

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
