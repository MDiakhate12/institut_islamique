import { z } from 'zod'

export const inviteTeacherSchema = z.object({
  email:       z.string().email("L'email est invalide"),
  fullName:    z.string().min(1, 'Le nom complet est requis'),
  phone:       z.string().optional(),
  gender:      z.enum(['male', 'female']).optional(),
  teacherType: z.enum(['volunteer', 'paid'], { message: 'Le type est requis' }),
})

export const updateTeacherSchema = z.object({
  fullName:    z.string().min(1, 'Le nom complet est requis').optional(),
  phone:       z.string().optional(),
  gender:      z.enum(['male', 'female']).optional(),
  teacherType: z.enum(['volunteer', 'paid']).optional(),
  isActive:    z.boolean().optional(),   // mappe sur !isPending
})

export type InviteTeacherInput = z.infer<typeof inviteTeacherSchema>
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>
