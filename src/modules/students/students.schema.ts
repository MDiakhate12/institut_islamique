import { z } from 'zod'

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  gender: z.enum(['male', 'female'], { message: 'Le genre est requis' }),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
})

export const updateStudentSchema = createStudentSchema.partial()

export type CreateStudentInput = z.infer<typeof createStudentSchema>
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>

// Schéma pour les filtres de la liste
export const studentFiltersSchema = z.object({
  gender: z.enum(['male', 'female', 'all']).default('all'),
  isActive: z.enum(['active', 'inactive', 'all']).default('all'),
  search: z.string().optional(),
})

export type StudentFilters = z.infer<typeof studentFiltersSchema>
