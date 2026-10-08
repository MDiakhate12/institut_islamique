import { z } from 'zod'

export const createClassSchema = z.object({
  subject:            z.string().min(1, 'La matière est requise'),
  name:               z.string().min(1, 'Le nom de la classe est requis'),
  curriculum:         z.string().optional(),
  room:               z.string().optional(),
  teacherId:          z.string().uuid().optional().nullable(),
  assistantTeacherId: z.string().uuid().optional().nullable(),
  // Absente à la création → année en cours de l'école (classesService.create)
  academicYear:       z.string().optional(),
})

export const updateClassSchema = createClassSchema.partial()

export type CreateClassInput = z.infer<typeof createClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>
