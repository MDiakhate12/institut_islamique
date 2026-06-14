import { db } from '@/db'
import { academicEvents } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import type { AcademicEvent } from './calendar.types'
import type { CreateEventInput, UpdateEventInput } from './calendar.schema'

export const calendarService = {
  // READ — all events for a school (optionally filtered by date range)
  async getBySchool(
    schoolId: string,
    opts?: { from?: string; to?: string; type?: string },
  ): Promise<AcademicEvent[]> {
    const conditions = [eq(academicEvents.schoolId, schoolId)]

    if (opts?.from) conditions.push(gte(academicEvents.startDate, opts.from))
    if (opts?.to)   conditions.push(lte(academicEvents.startDate, opts.to))
    if (opts?.type) conditions.push(eq(academicEvents.type, opts.type as AcademicEvent['type']))

    return db
      .select()
      .from(academicEvents)
      .where(and(...conditions))
      .orderBy(academicEvents.startDate, academicEvents.startTime)
  },

  async getById(schoolId: string, id: string): Promise<AcademicEvent | null> {
    const [event] = await db
      .select()
      .from(academicEvents)
      .where(and(eq(academicEvents.id, id), eq(academicEvents.schoolId, schoolId)))
      .limit(1)
    return event ?? null
  },

  async create(schoolId: string, data: CreateEventInput, createdBy: string | null): Promise<AcademicEvent> {
    const [event] = await db
      .insert(academicEvents)
      .values({
        schoolId,
        title:       data.title,
        type:        data.type,
        startDate:   data.startDate,
        endDate:     data.endDate ?? data.startDate,
        startTime:   data.isAllDay ? null : (data.startTime ?? null),
        endTime:     data.isAllDay ? null : (data.endTime ?? null),
        isAllDay:    data.isAllDay,
        location:    data.location ?? null,
        description: data.description ?? null,
        isHidden:    data.isHidden,
        createdBy,
      })
      .returning()
    return event
  },

  async update(schoolId: string, data: UpdateEventInput): Promise<AcademicEvent> {
    const { id, ...rest } = data
    const [event] = await db
      .update(academicEvents)
      .set({
        ...(rest.title       !== undefined && { title: rest.title }),
        ...(rest.type        !== undefined && { type: rest.type }),
        ...(rest.startDate   !== undefined && { startDate: rest.startDate }),
        ...(rest.endDate     !== undefined && { endDate: rest.endDate }),
        ...(rest.startTime   !== undefined && { startTime: rest.isAllDay ? null : rest.startTime }),
        ...(rest.endTime     !== undefined && { endTime: rest.isAllDay ? null : rest.endTime }),
        ...(rest.isAllDay    !== undefined && { isAllDay: rest.isAllDay }),
        ...(rest.location    !== undefined && { location: rest.location ?? null }),
        ...(rest.description !== undefined && { description: rest.description ?? null }),
        ...(rest.isHidden    !== undefined && { isHidden: rest.isHidden }),
      })
      .where(and(eq(academicEvents.id, id), eq(academicEvents.schoolId, schoolId)))
      .returning()
    return event
  },

  async delete(schoolId: string, id: string): Promise<void> {
    await db
      .delete(academicEvents)
      .where(and(eq(academicEvents.id, id), eq(academicEvents.schoolId, schoolId)))
  },

  // Duplicate an event
  async duplicate(schoolId: string, id: string, createdBy: string | null): Promise<AcademicEvent> {
    const original = await calendarService.getById(schoolId, id)
    if (!original) throw new Error('Événement introuvable')
    return calendarService.create(schoolId, {
      title:       `${original.title} (copie)`,
      type:        original.type as CreateEventInput['type'],
      startDate:   original.startDate,
      endDate:     original.endDate ?? original.startDate,
      startTime:   original.startTime ?? undefined,
      endTime:     original.endTime ?? undefined,
      isAllDay:    original.isAllDay,
      location:    original.location ?? undefined,
      description: original.description ?? undefined,
      isHidden:    original.isHidden,
    }, createdBy)
  },
}
