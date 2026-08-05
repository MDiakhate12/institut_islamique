import { z } from 'zod'
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from '@/lib/constants'

export const createExpenseSchema = z.object({
  date: z.string(),
  amount: z.number().min(0),
  category: z.enum(EXPENSE_CATEGORIES).nullable(),
  description: z.string().min(1, 'Description requise'),
  receipt: z.object({
    base64: z.string(),
    mimeType: z.string(),
  }).nullable(),
})
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>

export const updateExpenseStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(EXPENSE_STATUSES),
})
export type UpdateExpenseStatusInput = z.infer<typeof updateExpenseStatusSchema>
