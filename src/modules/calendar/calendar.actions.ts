'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { ok, err, unauthorized } from '@/lib/result'
import { calendarService } from './calendar.service'
import { createEventSchema, updateEventSchema } from './calendar.schema'
import type { ActionResult } from '@/lib/result'
import type { AcademicEvent } from './calendar.types'
import { db } from '@/db'
import { schoolMembers } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

/** Resolve school_members.id from auth userId + schoolId */
async function getMemberId(userId: string, schoolId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: schoolMembers.id })
    .from(schoolMembers)
    .where(and(eq(schoolMembers.userId, userId), eq(schoolMembers.schoolId, schoolId)))
    .limit(1)
  return row?.id ?? null
}

export async function getEventsAction(opts?: {
  from?: string; to?: string; type?: string
}): Promise<ActionResult<AcademicEvent[]>> {
  const session = await requireSession()
  try {
    const data = await calendarService.getBySchool(session.schoolId, opts)
    return ok(data)
  } catch (e) {
    console.error('[getEventsAction]', e)
    return err('Impossible de charger les événements')
  }
}

export async function createEventAction(input: unknown): Promise<ActionResult<AcademicEvent>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = createEventSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const memberId = await getMemberId(session.userId, session.schoolId)
    const event = await calendarService.create(session.schoolId, parsed.data, memberId)
    revalidatePath('/admin-portal/academic-calendar')
    return ok(event)
  } catch (e) {
    console.error('[createEventAction]', e)
    return err("Impossible de créer l'événement")
  }
}

export async function updateEventAction(input: unknown): Promise<ActionResult<AcademicEvent>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = updateEventSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const event = await calendarService.update(session.schoolId, parsed.data)
    revalidatePath('/admin-portal/academic-calendar')
    return ok(event)
  } catch (e) {
    console.error('[updateEventAction]', e)
    return err("Impossible de modifier l'événement")
  }
}

export async function deleteEventAction(id: string): Promise<ActionResult<null>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    await calendarService.delete(session.schoolId, id)
    revalidatePath('/admin-portal/academic-calendar')
    return ok(null)
  } catch (e) {
    console.error('[deleteEventAction]', e)
    return err("Impossible de supprimer l'événement")
  }
}

export async function duplicateEventAction(id: string): Promise<ActionResult<AcademicEvent>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    const memberId = await getMemberId(session.userId, session.schoolId)
    const event = await calendarService.duplicate(session.schoolId, id, memberId)
    revalidatePath('/admin-portal/academic-calendar')
    return ok(event)
  } catch (e) {
    console.error('[duplicateEventAction]', e)
    return err("Impossible de dupliquer l'événement")
  }
}

// Send reminder (stub — future: use Resend to email all school members)
export async function sendReminderAction(eventId: string): Promise<ActionResult<null>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    const event = await calendarService.getById(session.schoolId, eventId)
    if (!event) return err('Événement introuvable')
    // TODO: send email via Resend to all school members
    console.log(`[sendReminderAction] Would send reminder for event: ${event.title}`)
    return ok(null)
  } catch (e) {
    console.error('[sendReminderAction]', e)
    return err("Impossible d'envoyer le rappel")
  }
}
