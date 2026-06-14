import { db } from '@/db'
import { schoolMembers, profiles } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { InviteTeacherInput, UpdateTeacherInput } from './teachers.schema'
import type { Teacher, TeacherListItem } from './teachers.types'

export const teachersService = {
  // READ — tous les enseignants de l'école avec nb de classes
  async getBySchool(schoolId: string): Promise<TeacherListItem[]> {
    // Récupérer les school_members qui ont le rôle teacher
    const members = await db
      .select({
        id: schoolMembers.id,
        userId: schoolMembers.userId,
        schoolId: schoolMembers.schoolId,
        teacherType: schoolMembers.teacherType,
        isPending: schoolMembers.isPending,
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

    // Récupérer les emails depuis Supabase Auth (service role)
    const userIds = members.map(m => m.userId)
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const emailMap = new Map(
      users
        .filter(u => userIds.includes(u.id))
        .map(u => [u.id, u.email ?? ''])
    )

    // Compter les classes actives par enseignant
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
      email: emailMap.get(m.userId) ?? '',
      classCount: classCountMap.get(m.id) ?? 0,
    }))
  },

  // READ — un seul enseignant
  async getById(schoolId: string, memberId: string): Promise<Teacher | null> {
    const [member] = await db
      .select({
        id: schoolMembers.id,
        userId: schoolMembers.userId,
        schoolId: schoolMembers.schoolId,
        teacherType: schoolMembers.teacherType,
        isPending: schoolMembers.isPending,
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

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(member.userId)
    return {
      ...member,
      teacherType: member.teacherType as 'volunteer' | 'paid' | null,
      gender: member.gender ?? null,
      createdAt: member.createdAt,
      email: user?.email ?? '',
    }
  },

  // CREATE — invite un enseignant par email
  async invite(schoolId: string, data: InviteTeacherInput, invitedBy: string): Promise<Teacher> {
    // 1. Inviter via Supabase Auth (envoie un email d'invitation)
    const { data: authData, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` }
    )
    if (error) throw new Error(error.message)

    const userId = authData.user.id

    // 2. Créer ou mettre à jour le profil
    await db
      .insert(profiles)
      .values({ userId, fullName: data.fullName, phone: data.phone ?? null, gender: data.gender ?? null })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { fullName: data.fullName, phone: data.phone ?? null, gender: data.gender ?? null, updatedAt: new Date() },
      })

    // 3. Créer le school_member avec rôle teacher
    const [member] = await db
      .insert(schoolMembers)
      .values({
        schoolId,
        userId,
        portalRoles: ['teacher'],
        teacherType: data.teacherType,
        isPending: false,
        createdBy: invitedBy,
      })
      .returning()

    return {
      id: member.id,
      userId,
      schoolId,
      teacherType: data.teacherType,
      isPending: false,
      createdAt: member.createdAt,
      fullName: data.fullName,
      phone: data.phone ?? null,
      gender: data.gender ?? null,
      avatarUrl: null,
      email: data.email,
    }
  },

  // UPDATE — modifier profil + type + statut
  async update(schoolId: string, memberId: string, data: UpdateTeacherInput): Promise<void> {
    // Récupérer userId
    const [member] = await db
      .select({ userId: schoolMembers.userId })
      .from(schoolMembers)
      .where(and(eq(schoolMembers.id, memberId), eq(schoolMembers.schoolId, schoolId)))
      .limit(1)

    if (!member) throw new Error('Enseignant introuvable')

    // Mettre à jour school_members (type + statut actif)
    const memberUpdate: Record<string, unknown> = {}
    if (data.teacherType !== undefined) memberUpdate.teacherType = data.teacherType
    if (data.isActive !== undefined) memberUpdate.isPending = !data.isActive
    if (Object.keys(memberUpdate).length > 0) {
      await db
        .update(schoolMembers)
        .set(memberUpdate)
        .where(eq(schoolMembers.id, memberId))
    }

    // Mettre à jour le profil
    await db
      .update(profiles)
      .set({
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.gender !== undefined && { gender: data.gender }),
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, member.userId))
  },

  // REMOVE — retirer le rôle teacher (ne supprime pas le compte)
  async removeFromSchool(schoolId: string, memberId: string): Promise<void> {
    await db
      .delete(schoolMembers)
      .where(and(eq(schoolMembers.id, memberId), eq(schoolMembers.schoolId, schoolId)))
  },
}
