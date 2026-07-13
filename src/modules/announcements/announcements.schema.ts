import { z } from 'zod'

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  content: z.string().min(1, 'Le contenu est requis'),
  audience: z.enum(['everyone', 'parents', 'teachers']).default('everyone'),
  imageUrl: z.string().nullable().optional(),
})

export const updateAnnouncementSchema = createAnnouncementSchema.partial()

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>
