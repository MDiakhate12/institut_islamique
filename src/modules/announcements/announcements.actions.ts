'use server'

import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { announcementsService } from './announcements.service'
import { createAnnouncementSchema, updateAnnouncementSchema } from './announcements.schema'
import type { Announcement } from './announcements.types'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'

function buildAnnouncementEmail(opts: { title: string; content: string }): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fdf6f0;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7a4f30,#c2440f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">Qaf School</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Nouvelle annonce</p>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#5c3820;font-size:20px;margin:0 0 16px;">${opts.title}</h2>
      <div style="color:#374151;font-size:15px;line-height:1.7;">${opts.content}</div>
    </div>
    <div style="background:#fdf6f0;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Qaf School — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body>
</html>`
}

export async function getAnnouncementsAction(
  portal: 'admin' | 'parents' | 'teachers' = 'admin',
): Promise<ActionResult<Announcement[]>> {
  const session = await requireSession()
  try {
    const data = await announcementsService.getForPortal(session.schoolId, portal)
    return ok(data)
  } catch (e) {
    console.error('[getAnnouncementsAction]', e)
    return err('Impossible de charger les annonces')
  }
}

export async function createAnnouncementAction(
  input: unknown,
): Promise<ActionResult<Announcement>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return err('Non autorisé')

  const parsed = createAnnouncementSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Données invalides')

  try {
    const announcement = await announcementsService.create(
      session.schoolId,
      session.memberId,
      parsed.data,
    )
    revalidatePath('/admin-portal/announcements')

    // Envoi email en arrière-plan (non bloquant pour l'utilisateur)
    announcementsService.getEmailsByAudience(session.schoolId, parsed.data.audience as 'everyone' | 'parents' | 'teachers' | 'admins').then(emails => {
      return Promise.allSettled(emails.map(to =>
        sendEmail({
          to,
          subject: `Nouvelle annonce : ${parsed.data.title}`,
          html: buildAnnouncementEmail({ title: parsed.data.title, content: parsed.data.content }),
        })
      ))
    }).catch(e => console.warn('[createAnnouncementAction] email error:', e))

    return ok(announcement)
  } catch (e) {
    console.error('[createAnnouncementAction]', e)
    return err("Impossible de créer l'annonce")
  }
}

export async function updateAnnouncementAction(
  id: string,
  input: unknown,
): Promise<ActionResult<Announcement>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return err('Non autorisé')

  const parsed = updateAnnouncementSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Données invalides')

  try {
    const announcement = await announcementsService.update(id, session.schoolId, parsed.data)
    revalidatePath('/admin-portal/announcements')
    return ok(announcement)
  } catch (e) {
    console.error('[updateAnnouncementAction]', e)
    return err("Impossible de modifier l'annonce")
  }
}

export async function deleteAnnouncementAction(id: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return err('Non autorisé')

  try {
    await announcementsService.delete(id, session.schoolId)
    revalidatePath('/admin-portal/announcements')
    return ok(undefined)
  } catch (e) {
    console.error('[deleteAnnouncementAction]', e)
    return err("Impossible de supprimer l'annonce")
  }
}
