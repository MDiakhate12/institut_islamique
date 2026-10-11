import { z } from 'zod'
import { optionalPhoneField } from '@/lib/phone'

export const saveParentSchema = z.object({
  /** Fiches `guardians` du parent (vide = nouveau parent). */
  guardianIds:    z.array(z.string()),
  relationship:   z.enum(['father', 'mother', 'guardian', 'other']),
  name:           z.string().trim().min(1, 'Le nom est requis'),
  email:          z.string().trim().email('E-mail invalide').or(z.literal('')).optional(),
  phone:          optionalPhoneField,
  emergencyPhone: optionalPhoneField,
  /** Enfants du parent après enregistrement. */
  studentIds:     z.array(z.string()).min(1, 'Choisissez au moins un enfant'),
})

export type SaveParentInput = z.infer<typeof saveParentSchema>

/** Tuteur d'UN élève (fiche `guardians` de cet élève seulement) — ajout, ou remplacement du parent d'une fiche. */
export const setStudentGuardianSchema = z.object({
  /** Fiche à remplacer ; absent = ajout d'un tuteur. */
  guardianId:     z.string().optional(),
  relationship:   z.enum(['father', 'mother', 'guardian', 'other']),
  name:           z.string().trim().optional(),
  email:          z.string().trim().email('E-mail invalide').or(z.literal('')).optional(),
  phone:          optionalPhoneField,
  emergencyPhone: optionalPhoneField,
}).refine(v => !!(v.name || v.email || v.phone), { message: 'Renseignez au moins un nom, un téléphone ou un e-mail' })

export type SetStudentGuardianInput = z.infer<typeof setStudentGuardianSchema>
