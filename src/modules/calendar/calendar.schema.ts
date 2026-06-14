import { z } from 'zod'

export const createEventSchema = z.object({
  title:       z.string().min(1, 'Le titre est requis'),
  type:        z.enum(['exam', 'meeting', 'fun_event', 'holiday', 'open_house',
                       'ceremony', 'beginning', 'closed', 'lecture', 'event', 'other']),
  startDate:   z.string().min(1, 'La date est requise'),  // 'YYYY-MM-DD'
  endDate:     z.string().optional(),
  startTime:   z.string().optional(),   // 'HH:mm'
  endTime:     z.string().optional(),   // 'HH:mm'
  isAllDay:    z.boolean().default(true),
  location:    z.string().optional(),
  description: z.string().optional(),
  isHidden:    z.boolean().default(false),
})
export type CreateEventInput = z.infer<typeof createEventSchema>

export const updateEventSchema = createEventSchema.partial().extend({
  id: z.string().uuid(),
})
export type UpdateEventInput = z.infer<typeof updateEventSchema>
