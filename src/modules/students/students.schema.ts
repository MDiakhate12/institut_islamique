import { z } from 'zod'

const guardianInputSchema = z.object({
  id:             z.string().optional(),
  relationship:   z.enum(['father', 'mother', 'guardian', 'other']),
  name:           z.string().optional(),
  phone:          z.string().optional(),
  email:          z.string().optional(),
  emergencyPhone: z.string().optional(),
  _delete:        z.boolean().optional(),
})

export type GuardianInput = z.infer<typeof guardianInputSchema>

export const createStudentSchema = z.object({
  firstName:      z.string().min(1, 'Le prénom est requis'),
  lastName:       z.string().min(1, 'Le nom est requis'),
  gender:         z.enum(['male', 'female'], { message: 'Le genre est requis' }),
  isActive:       z.boolean(),
  birthDate:      z.string().optional(),
  notes:          z.string().optional(),
  enrollmentYear: z.string().optional(),
  guardians:      z.array(guardianInputSchema).optional(),
  // Class enrollment (create flow)
  classIdsToAdd:  z.array(z.string()).optional(),
  paymentT1:      z.boolean().optional(),
  paymentT2:      z.boolean().optional(),
  paymentT3:      z.boolean().optional(),
})

export const updateStudentSchema = z.object({
  firstName:      z.string().min(1).optional(),
  lastName:       z.string().min(1).optional(),
  gender:         z.enum(['male', 'female']).optional(),
  isActive:       z.boolean().optional(),
  birthDate:      z.string().optional(),
  notes:          z.string().optional(),
  enrollmentYear: z.string().optional(),
  guardians:      z.array(guardianInputSchema).optional(),
  // Class enrollment changes
  classIdsToAdd:    z.array(z.string()).optional(),
  classIdsToRemove: z.array(z.string()).optional(),
  paymentUpdates:   z.array(z.object({
    classId: z.string(),
    t1:      z.boolean(),
    t2:      z.boolean(),
    t3:      z.boolean(),
  })).optional(),
})

export type CreateStudentInput = z.output<typeof createStudentSchema>
export type UpdateStudentInput = z.output<typeof updateStudentSchema>
