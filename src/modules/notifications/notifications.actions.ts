'use server'

import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { notificationsService } from './notifications.service'
import type { Notification, CreateNotificationInput } from './notifications.types'

export async function getNotificationsAction(): Promise<ActionResult<Notification[]>> {
  const session = await requireSession()
  try {
    const data = await notificationsService.getForMember(session.memberId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement des notifications')
  }
}

export async function getUnreadCountAction(): Promise<ActionResult<number>> {
  const session = await requireSession()
  try {
    const count = await notificationsService.countUnread(session.memberId)
    return ok(count)
  } catch {
    return err('Erreur')
  }
}

export async function markNotificationReadAction(id: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await notificationsService.markRead(id, session.memberId)
    return ok(undefined)
  } catch {
    return err('Erreur')
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await notificationsService.markAllRead(session.memberId)
    return ok(undefined)
  } catch {
    return err('Erreur')
  }
}

// Called internally from other server actions — does NOT need a session
export async function createNotificationInternal(input: CreateNotificationInput): Promise<void> {
  try {
    await notificationsService.create(input)
  } catch (e) {
    console.warn('[createNotificationInternal] failed:', e)
  }
}
