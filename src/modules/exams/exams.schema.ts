import { z } from 'zod'

export const submitExamSchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  trimester: z.number().int().min(1).max(3),
  academicYear: z.string().nullable(),
  attendance: z.number().int().min(1).max(5),
  respectTeachers: z.number().int().min(1).max(5),
  respectOthers: z.number().int().min(1).max(5),
  bringBooks: z.number().int().min(1).max(5).nullable(),
  participation: z.number().int().min(1).max(5),
  eagerness: z.number().int().min(1).max(5),
  coveredContent: z.string().nullable(),
  generalComments: z.string().nullable(),
  score: z.number().int().min(0).max(100).nullable(),
})

export type SubmitExamInput = z.infer<typeof submitExamSchema>

export const signGradeSchema = z.object({
  examResultId: z.string().uuid(),
  parentSignature: z.string().min(1),
})

export type SignGradeInput = z.infer<typeof signGradeSchema>
