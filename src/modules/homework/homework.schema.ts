import { z } from 'zod'

export const homeworkSurahSchema = z.object({
  name:   z.string(),
  arabic: z.string(),
})

const homeworkBaseSchema = z.object({
  classId:          z.string().uuid('Classe invalide'),
  hasNewSurah:      z.boolean().default(false),
  surahName:        z.string().optional(),
  surahArabic:      z.string().optional(),
  fromVerse:        z.number().int().positive().optional(),
  toVerse:          z.number().int().positive().optional(),
  isFullSurah:      z.boolean().default(false),
  hasRevision:      z.boolean().default(false),
  revisionSurahs:   z.array(homeworkSurahSchema).default([]),
  description:      z.string().optional(),
  fileUrl:          z.string().optional(),
  fileName:         z.string().optional(),
  fileSize:         z.number().int().optional(),
})

export const createHomeworkSchema = homeworkBaseSchema.refine(d => d.hasNewSurah || d.hasRevision, {
  message: 'Au moins un type de devoir doit être sélectionné',
  path: ['hasNewSurah'],
})

export const updateHomeworkSchema = homeworkBaseSchema.partial().omit({ classId: true })

export type CreateHomeworkInput = z.infer<typeof createHomeworkSchema>
export type UpdateHomeworkInput = z.infer<typeof updateHomeworkSchema>
