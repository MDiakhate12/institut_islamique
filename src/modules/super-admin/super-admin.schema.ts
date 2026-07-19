import { z } from 'zod'

export const createSchoolSchema = z.object({
  schoolName:  z.string().min(2, 'Nom de l\'école requis'),
  schoolSlug:  z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug : minuscules, chiffres et tirets uniquement'),
  adminEmail:  z.string().email('Email invalide'),
})

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>

export const updateSchoolBasicSchema = z.object({
  name: z.string().min(2, 'Nom requis'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug : minuscules, chiffres et tirets uniquement'),
})

export type UpdateSchoolBasicInput = z.infer<typeof updateSchoolBasicSchema>
