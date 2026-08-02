import { db } from '@/db'
import { announcements, schoolMembers, profiles } from '@/db/schema'
import { eq, and, or, desc, ne } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import type { Announcement } from './announcements.types'
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from './announcements.schema'
import type { AnnouncementAudience } from '@/lib/constants'

function mapRow(row: {
  id: string
  schoolId: string | null
  title: string
  content: string
  audience: AnnouncementAudience
  imageUrl: string | null
  isGlobal: boolean
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  fullName: string | null
}): Announcement {
  return {
    id: row.id,
    schoolId: row.schoolId,
    title: row.title,
    content: row.content,
    audience: row.audience,
    imageUrl: row.imageUrl,
    isGlobal: row.isGlobal,
    createdBy: row.createdBy,
    createdByName: row.fullName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const announcementsService = {
  async getForPortal(schoolId: string, portal: 'admin' | 'parents' | 'teachers'): Promise<Announcement[]> {
    const audienceFilter = portal === 'admin'
      ? or(
          eq(announcements.schoolId, schoolId),
          eq(announcements.isGlobal, true),
        )
      : portal === 'parents'
        ? and(
            eq(announcements.schoolId, schoolId),
            or(
              eq(announcements.audience, 'everyone'),
              eq(announcements.audience, 'parents'),
            ),
          )
        : and(
            eq(announcements.schoolId, schoolId),
            or(
              eq(announcements.audience, 'everyone'),
              eq(announcements.audience, 'teachers'),
            ),
          )

    const rows = await db
      .select({
        id: announcements.id,
        schoolId: announcements.schoolId,
        title: announcements.title,
        content: announcements.content,
        audience: announcements.audience,
        imageUrl: announcements.imageUrl,
        isGlobal: announcements.isGlobal,
        createdBy: announcements.createdBy,
        createdAt: announcements.createdAt,
        updatedAt: announcements.updatedAt,
        fullName: profiles.fullName,
      })
      .from(announcements)
      .leftJoin(schoolMembers, eq(schoolMembers.id, announcements.createdBy))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(audienceFilter)
      .orderBy(desc(announcements.createdAt))

    return rows.map(r => mapRow(r as Parameters<typeof mapRow>[0]))
  },

  async create(
    schoolId: string,
    memberId: string,
    data: CreateAnnouncementInput,
  ): Promise<Announcement> {
    const [row] = await db
      .insert(announcements)
      .values({
        schoolId,
        title: data.title,
        content: data.content,
        audience: data.audience as AnnouncementAudience,
        imageUrl: data.imageUrl ?? null,
        createdBy: memberId,
      })
      .returning()

    return {
      ...row,
      audience: row.audience as AnnouncementAudience,
      createdByName: null,
    }
  },

  async update(id: string, schoolId: string, data: UpdateAnnouncementInput): Promise<Announcement> {
    const [row] = await db
      .update(announcements)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.audience !== undefined && { audience: data.audience as AnnouncementAudience }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        updatedAt: new Date(),
      })
      .where(and(eq(announcements.id, id), eq(announcements.schoolId, schoolId)))
      .returning()

    return {
      ...row,
      audience: row.audience as AnnouncementAudience,
      createdByName: null,
    }
  },

  async delete(id: string, schoolId: string): Promise<void> {
    await db
      .delete(announcements)
      .where(and(eq(announcements.id, id), eq(announcements.schoolId, schoolId)))
  },

  async getEmailsByAudience(schoolId: string, audience: AnnouncementAudience): Promise<string[]> {
    const NIL_UUID = '00000000-0000-0000-0000-000000000000'

    // Filtre sur portal_roles selon l'audience
    const roleFilter = audience === 'parents'
      ? sql`'parent' = ANY(${schoolMembers.portalRoles})`
      : audience === 'teachers'
        ? sql`'teacher' = ANY(${schoolMembers.portalRoles})`
        : audience === 'admins'
          ? sql`'admin' = ANY(${schoolMembers.portalRoles})`
          : sql`true` // 'everyone'

    const rows = await db.execute(sql`
      SELECT au.email
      FROM school_members sm
      JOIN auth.users au ON au.id = sm.user_id
      WHERE sm.school_id = ${schoolId}
        AND sm.is_pending = false
        AND sm.user_id != ${NIL_UUID}::uuid
        AND ${roleFilter}
    `)

    return (rows as unknown as { email: string }[]).map(r => r.email).filter(Boolean)
  },
}
