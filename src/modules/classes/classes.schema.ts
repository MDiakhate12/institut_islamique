import { z } from 'zod'

export const createCatalogClassSchema = z.object({
  subjectCode:  z.string().min(1, 'Le type de matière est requis'),
  levelNumber:  z.string().optional(),
  name:         z.string().min(1, 'Le nom de la classe est requis'),
  nextClassId:  z.string().uuid().optional().nullable(),
  curriculum:   z.string().optional().nullable(),
})

export const updateCatalogClassSchema = createCatalogClassSchema.partial()

export type CreateCatalogClassInput = z.infer<typeof createCatalogClassSchema>
export type UpdateCatalogClassInput = z.infer<typeof updateCatalogClassSchema>
