import { z } from 'zod'
import { PAYMENT_METHODS, PAYMENT_CATEGORIES, PAYMENT_PERIODS, PAYMENT_STATUSES } from '@/lib/constants'

export const createPaymentSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, 'Sélectionnez au moins un élève'),
  parentName: z.string().nullable(),
  amount: z.number().min(0),
  category: z.enum(PAYMENT_CATEGORIES),
  period: z.enum(PAYMENT_PERIODS),
  method: z.enum(PAYMENT_METHODS),
  financialOption: z.string().nullable(),
  status: z.enum(PAYMENT_STATUSES),
  paymentDate: z.string().nullable(),
  notes: z.string().nullable(),
})
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>

export const createParentPaymentSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, 'Sélectionnez au moins un enfant'),
  amount: z.number().min(0),
  category: z.enum(PAYMENT_CATEGORIES),
  period: z.enum(PAYMENT_PERIODS),
  method: z.enum(PAYMENT_METHODS),
  financialOption: z.string().nullable(),
  paymentDate: z.string().nullable(),
  notes: z.string().nullable(),
})
export type CreateParentPaymentInput = z.infer<typeof createParentPaymentSchema>

export const updatePaymentSchema = createPaymentSchema.extend({
  id: z.string().uuid(),
})
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>
