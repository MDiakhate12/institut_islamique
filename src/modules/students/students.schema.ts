import { z } from 'zod'
import { optionalPhoneField } from '@/lib/phone'
import { MAX_GUARDIANS_PER_STUDENT } from '@/lib/constants'

const guardianInputSchema = z.object({
  id:             z.string().optional(),
  relationship:   z.enum(['father', 'mother', 'guardian', 'other']),
  name:           z.string().optional(),
  phone:          optionalPhoneField,
  email:          z.string().optional(),
  emergencyPhone: optionalPhoneField,
  _delete:        z.boolean().optional(),
})

export type GuardianInput = z.infer<typeof guardianInputSchema>

// 2 tuteurs au maximum par élève (les retraits `_delete` ne comptent pas)
const guardiansField = z.array(guardianInputSchema).refine(
  list => list.filter(g => !g._delete).length <= MAX_GUARDIANS_PER_STUDENT,
  { message: `Un élève a au maximum ${MAX_GUARDIANS_PER_STUDENT} tuteurs` },
).optional()

const birthDateField = z.string().optional().refine(
  val => !val || (!isNaN(new Date(val).getTime()) && new Date(val) <= new Date()),
  { message: 'Date de naissance invalide ou dans le futur' }
)

export const createStudentSchema = z.object({
  firstName:      z.string().min(1, 'Le prénom est requis'),
  lastName:       z.string().min(1, 'Le nom est requis'),
  gender:         z.enum(['male', 'female'], { message: 'Le genre est requis' }),
  isActive:       z.boolean(),
  birthDate:      birthDateField,
  notes:          z.string().optional(),
  enrollmentYear: z.string().optional(),
  guardians:      guardiansField,
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
  birthDate:      birthDateField,
  notes:          z.string().optional(),
  enrollmentYear: z.string().optional(),
  guardians:      guardiansField,
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
