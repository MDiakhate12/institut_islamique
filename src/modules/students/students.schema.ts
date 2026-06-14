import { z } from 'zod'

export const createStudentSchema = z.object({
  firstName:    z.string().min(1, 'Le prénom est requis'),
  lastName:     z.string().min(1, 'Le nom est requis'),
  gender:       z.enum(['male', 'female'], { message: 'Le genre est requis' }),
  isActive:     z.boolean(),
  birthDate:    z.string().optional(),
  parentPhone:  z.string().optional(),
  parentName1:  z.string().optional(),
  parentName2:  z.string().optional(),
  parentEmail1: z.string().email('Email invalide').optional().or(z.literal('')),
  parentEmail2: z.string().email('Email invalide').optional().or(z.literal('')),
  emergencyPhone: z.string().optional(),
  notes:        z.string().optional(),
})

export const updateStudentSchema = createStudentSchema.partial()

export type CreateStudentInput = z.output<typeof createStudentSchema>
export type UpdateStudentInput = z.output<typeof updateStudentSchema>
