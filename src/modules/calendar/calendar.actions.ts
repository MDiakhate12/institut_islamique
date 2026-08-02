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
import { sql } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'
import { EVENT_TYPE_CONFIG } from './calendar.types'

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

export async function sendReminderAction(eventId: string): Promise<ActionResult<null>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    const event = await calendarService.getById(session.schoolId, eventId)
    if (!event) return err('Événement introuvable')

    const NIL_UUID = '00000000-0000-0000-0000-000000000000'
    const rows = await db.execute<{ email: string }>(sql`
      SELECT au.email
      FROM school_members sm
      JOIN auth.users au ON au.id = sm.user_id
      WHERE sm.school_id = ${session.schoolId}
        AND sm.is_pending = false
        AND sm.user_id != ${NIL_UUID}::uuid
    `)
    const emails = (rows as unknown as { email: string }[]).map(r => r.email).filter(Boolean)

    const config = EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG]
    const emoji = config?.emoji ?? '📅'
    const typeLabel = config?.label ?? event.type
    const dateStr = new Date(event.startDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fdf6f0;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7a4f30,#c2440f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">Qaf School</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Rappel d'événement</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#5c3820;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Rappel pour l'événement suivant :
      </p>
      <div style="background:#fdf6f0;border-left:4px solid #c2440f;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#1f2937;">${emoji} ${event.title}</p>
        <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">${typeLabel}</p>
        <p style="margin:0;font-size:14px;color:#6b7280;">📅 ${dateStr}${event.startTime ? ` à ${event.startTime}` : ''}</p>
        ${event.description ? `<p style="margin:12px 0 0;font-size:14px;color:#374151;">${event.description}</p>` : ''}
      </div>
    </div>
    <div style="background:#fdf6f0;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Qaf School — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body>
</html>`

    await Promise.allSettled(
      emails.map(to => sendEmail({ to, subject: `Rappel : ${event.title}`, html }))
    )

    return ok(null)
  } catch (e) {
    console.error('[sendReminderAction]', e)
    return err("Impossible d'envoyer le rappel")
  }
}
