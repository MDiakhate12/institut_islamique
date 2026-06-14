import { z } from 'zod'

// ── Catalog class schemas ─────────────────────────────────────────────────────

export const createCatalogClassSchema = z.object({
  subjectCode:     z.string().min(1, 'Le type de matière est requis'),
  levelNumber:     z.string().optional(),
  name:            z.string().min(1, 'Le nom de la classe est requis'),
  previousClassId: z.string().uuid().optional().nullable(),
  nextClassId:     z.string().uuid().optional().nullable(),
  curriculum:      z.string().optional().nullable(),
})

export const updateCatalogClassSchema = createCatalogClassSchema.partial()

export type CreateCatalogClassInput = z.infer<typeof createCatalogClassSchema>
export type UpdateCatalogClassInput = z.infer<typeof updateCatalogClassSchema>

// ── Scheduled class schemas ───────────────────────────────────────────────────

export const createClassSchema = z.object({
  catalogClassId:     z.string().uuid('Sélectionner un numéro de classe'),
  section:            z.string().optional(),
  room:               z.string().optional(),
  teacherId:          z.string().uuid().optional().nullable(),
  assistantTeacherId: z.string().uuid().optional().nullable(),
  academicYear:       z.string().min(1, "L'année académique est requise"),
})

export const updateClassSchema = createClassSchema.partial()

export type CreateClassInput = z.infer<typeof createClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>
