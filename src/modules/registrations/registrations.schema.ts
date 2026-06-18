import { z } from 'zod'

export const formTypeSchema = z.enum(['new_student', 'reenrollment'])

export const updateFormSchemaSchema = z.object({
  formType: formTypeSchema,
  formSchema: z.array(z.unknown()), // validated as FormItem[] at runtime
})

export type UpdateFormSchemaInput = z.infer<typeof updateFormSchemaSchema>
