import { db } from '@/db'
import { schoolMembers, profiles } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { InviteTeacherInput, UpdateTeacherInput } from './teachers.schema'
import type { Teacher, TeacherListItem } from './teachers.types'

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

export const teachersService = {
  async getBySchool(schoolId: string): Promise<TeacherListItem[]> {
    const members = await db
      .select({
        id: schoolMembers.id,
        userId: schoolMembers.userId,
        schoolId: schoolMembers.schoolId,
        teacherType: schoolMembers.teacherType,
        isPending: schoolMembers.isPending,
        pendingEmail: schoolMembers.pendingEmail,
        createdAt: schoolMembers.createdAt,
        fullName: profiles.fullName,
        phone: profiles.phone,
        gender: profiles.gender,
        avatarUrl: profiles.avatarUrl,
      })
      .from(schoolMembers)
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(
        and(
          eq(schoolMembers.schoolId, schoolId),
          sql`'teacher' = ANY(${schoolMembers.portalRoles})`
        )
      )

    if (members.length === 0) return []

    // Fetch emails from Supabase Auth for real users (not NIL_UUID placeholders)
    const realUserIds = members.map(m => m.userId).filter(id => id !== NIL_UUID)
    let emailMap = new Map<string, string>()
    if (realUserIds.length > 0) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
      emailMap = new Map(
        users
          .filter(u => realUserIds.includes(u.id))
          .map(u => [u.id, u.email ?? ''])
      )
    }

    const { classes } = await import('@/db/schema')
    const classCounts = await db
      .select({
        teacherId: classes.teacherId,
        count: sql<number>`count(*)::int`,
      })
      .from(classes)
      .where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true)))
      .groupBy(classes.teacherId)

    const classCountMap = new Map(
      classCounts.map(r => [r.teacherId, r.count])
    )

    return members.map(m => ({
      ...m,
      teacherType: m.teacherType as 'volunteer' | 'paid' | null,
      gender: m.gender ?? null,
      createdAt: m.createdAt,
      email: emailMap.get(m.userId) || m.pendingEmail || '',
      classCount: classCountMap.get(m.id) ?? 0,
    }))
  },

  async getById(schoolId: string, memberId: string): Promise<Teacher | null> {
    const [member] = await db
      .select({
        id: schoolMembers.id,
        userId: schoolMembers.userId,
        schoolId: schoolMembers.schoolId,
        teacherType: schoolMembers.teacherType,
        isPending: schoolMembers.isPending,
        pendingEmail: schoolMembers.pendingEmail,
        createdAt: schoolMembers.createdAt,
        fullName: profiles.fullName,
        phone: profiles.phone,
        gender: profiles.gender,
        avatarUrl: profiles.avatarUrl,
      })
      .from(schoolMembers)
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(and(eq(schoolMembers.id, memberId), eq(schoolMembers.schoolId, schoolId)))
      .limit(1)

    if (!member) return null

    let email = member.pendingEmail || ''
    if (member.userId !== NIL_UUID) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(member.userId)
      email = user?.email ?? email
    }

    return {
      ...member,
      teacherType: member.teacherType as 'volunteer' | 'paid' | null,
      gender: member.gender ?? null,
      createdAt: member.createdAt,
      email,
    }
  },

  // Creates a pending teacher record (admin flow — no email invite, teacher self-registers)
  async invite(schoolId: string, data: InviteTeacherInput, invitedBy: string): Promise<Teacher> {
    const [member] = await db
      .insert(schoolMembers)
      .values({
        schoolId,
        userId: NIL_UUID,
        portalRoles: ['teacher'],
        teacherType: data.teacherType,
        isPending: true,
        pendingEmail: data.email.toLowerCase(),
        createdBy: invitedBy,
      })
      .returning()

    // Store name/phone in a pseudo-profile keyed by NIL_UUID — or just return as-is
    // Profile will be created when the teacher actually signs up
    return {
      id: member.id,
      userId: NIL_UUID,
      schoolId,
      teacherType: data.teacherType,
      isPending: true,
      createdAt: member.createdAt,
      fullName: data.fullName,
      phone: data.phone ?? null,
      gender: data.gender ?? null,
      avatarUrl: null,
      email: data.email,
    }
  },

  async update(schoolId: string, memberId: string, data: UpdateTeacherInput): Promise<void> {
    const [member] = await db
      .select({ userId: schoolMembers.userId })
      .from(schoolMembers)
      .where(and(eq(schoolMembers.id, memberId), eq(schoolMembers.schoolId, schoolId)))
      .limit(1)

    if (!member) throw new Error('Enseignant introuvable')

    const memberUpdate: Record<string, unknown> = {}
    if (data.teacherType !== undefined) memberUpdate.teacherType = data.teacherType
    if (data.isActive !== undefined) memberUpdate.isPending = !data.isActive
    if (Object.keys(memberUpdate).length > 0) {
      await db
        .update(schoolMembers)
        .set(memberUpdate)
        .where(eq(schoolMembers.id, memberId))
    }

    // Only update profile if the teacher has a real auth account
    if (member.userId !== NIL_UUID) {
      await db
        .update(profiles)
        .set({
          ...(data.fullName && { fullName: data.fullName }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.gender !== undefined && { gender: data.gender }),
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, member.userId))
    }
  },

  async removeFromSchool(schoolId: string, memberId: string): Promise<void> {
    await db
      .delete(schoolMembers)
      .where(and(eq(schoolMembers.id, memberId), eq(schoolMembers.schoolId, schoolId)))
  },
}
