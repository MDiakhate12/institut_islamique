'use server'

import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { announcementsService } from './announcements.service'
import { createAnnouncementSchema, updateAnnouncementSchema } from './announcements.schema'
import type { Announcement } from './announcements.types'
import { revalidatePath } from 'next/cache'

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
