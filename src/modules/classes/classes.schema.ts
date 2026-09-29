import { z } from 'zod'

export const createClassSchema = z.object({
  subject:            z.string().min(1, 'La matière est requise'),
  name:               z.string().min(1, 'Le nom de la classe est requis'),
  section:            z.string().optional(),
  room:               z.string().optional(),
  teacherId:          z.string().uuid().optional().nullable(),
  assistantTeacherId: z.string().uuid().optional().nullable(),
  academicYear:       z.string().min(1, "L'année académique est requise"),
})

export const updateClassSchema = createClassSchema.partial()

export type CreateClassInput = z.infer<typeof createClassSchema>
export type UpdateClassInput = z.infer<typeof updateClassSchema>
