import { z } from 'zod'
import { WAGE_STATUSES } from '@/lib/constants'

export const logHoursSchema = z.object({
  teacherId: z.string().uuid(),
  classId: z.string().uuid().nullable(),
  date: z.string(),
  hoursWorked: z.number().int().min(1),
})
export type LogHoursInput = z.infer<typeof logHoursSchema>

export const logMyHoursSchema = z.object({
  classId: z.string().uuid().nullable(),
  date: z.string(),
  hoursWorked: z.number().int().min(1),
})
export type LogMyHoursInput = z.infer<typeof logMyHoursSchema>

export const updateWageStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(WAGE_STATUSES),
  hourlyRateCents: z.number().int().min(0),
})
export type UpdateWageStatusInput = z.infer<typeof updateWageStatusSchema>
