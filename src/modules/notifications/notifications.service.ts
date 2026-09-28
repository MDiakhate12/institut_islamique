import { db } from '@/db'
import { notifications } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import type { CreateNotificationInput, Notification } from './notifications.types'

export const notificationsService = {
  async create(input: CreateNotificationInput): Promise<void> {
    await db.insert(notifications).values({
      schoolId: input.schoolId,
      recipientMemberId: input.recipientMemberId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    })
  },

  async getForMember(memberId: string, limit = 30): Promise<Notification[]> {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientMemberId, memberId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)

    return rows.map(r => ({
      id: r.id,
      schoolId: r.schoolId,
      recipientMemberId: r.recipientMemberId,
      type: r.type as Notification['type'],
      title: r.title,
      body: r.body,
      link: r.link,
      readAt: r.readAt,
      createdAt: r.createdAt,
    }))
  },

  async countUnread(memberId: string): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.recipientMemberId, memberId),
        isNull(notifications.readAt),
      ))
    return row?.count ?? 0
  },

  async markRead(notificationId: string, memberId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientMemberId, memberId),
      ))
  },

  async markAllRead(memberId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(
        eq(notifications.recipientMemberId, memberId),
        isNull(notifications.readAt),
      ))
  },
}
