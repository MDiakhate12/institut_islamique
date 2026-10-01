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
        fullName: sql<string | null>`coalesce(${profiles.fullName}, ${schoolMembers.fullName})`,
        phone: sql<string | null>`coalesce(${profiles.phone}, ${schoolMembers.phone})`,
        gender: sql<string | null>`coalesce(${profiles.gender}, ${schoolMembers.gender})`,
        avatarUrl: profiles.avatarUrl,
        documentUrl: schoolMembers.documentUrl,
        documentName: schoolMembers.documentName,
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
        fullName: sql<string | null>`coalesce(${profiles.fullName}, ${schoolMembers.fullName})`,
        phone: sql<string | null>`coalesce(${profiles.phone}, ${schoolMembers.phone})`,
        gender: sql<string | null>`coalesce(${profiles.gender}, ${schoolMembers.gender})`,
        avatarUrl: profiles.avatarUrl,
        documentUrl: schoolMembers.documentUrl,
        documentName: schoolMembers.documentName,
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

  async invite(schoolId: string, data: InviteTeacherInput, invitedBy: string): Promise<Teacher> {
    const normalizedEmail = data.email.toLowerCase().trim()

    // Check if a Qaf account already exists for this email
    const rows = await db.execute(sql`SELECT id FROM auth.users WHERE email = ${normalizedEmail} LIMIT 1`)
    const authUserId = (rows as unknown as { id: string }[])[0]?.id ?? null

    if (authUserId) {
      // User has an account — find their school_members record for this school
      const [existing] = await db
        .select({ id: schoolMembers.id, portalRoles: schoolMembers.portalRoles, isPending: schoolMembers.isPending, createdAt: schoolMembers.createdAt })
        .from(schoolMembers)
        .where(and(eq(schoolMembers.schoolId, schoolId), eq(schoolMembers.userId, authUserId)))
        .limit(1)

      if (existing) {
        // Guard: already an active teacher → nothing to do
        if (existing.portalRoles.includes('teacher') && !existing.isPending) {
          throw new Error('ALREADY_ACTIVE_TEACHER')
        }

        // Update: add 'teacher' role + require activation
        const newRoles = existing.portalRoles.includes('teacher')
          ? existing.portalRoles
          : [...existing.portalRoles, 'teacher']

        await db
          .update(schoolMembers)
          .set({ portalRoles: newRoles, teacherType: data.teacherType, isPending: true, createdBy: invitedBy })
          .where(eq(schoolMembers.id, existing.id))

        return {
          id: existing.id,
          userId: authUserId,
          schoolId,
          teacherType: data.teacherType,
          isPending: true,
          createdAt: existing.createdAt,
          fullName: data.fullName,
          phone: data.phone ?? null,
          gender: data.gender ?? null,
          avatarUrl: null,
          documentUrl: null,
          documentName: null,
          email: data.email,
        }
      }

      // No record yet for this school — create with real userId (no NIL_UUID)
      const [member] = await db
        .insert(schoolMembers)
        .values({
          schoolId,
          userId: authUserId,
          portalRoles: ['teacher'],
          teacherType: data.teacherType,
          isPending: true,
          fullName: data.fullName,
          phone: data.phone ?? null,
          gender: data.gender ?? null,
          createdBy: invitedBy,
        })
        .returning()

      return {
        id: member.id,
        userId: authUserId,
        schoolId,
        teacherType: data.teacherType,
        isPending: true,
        createdAt: member.createdAt,
        fullName: data.fullName,
        phone: data.phone ?? null,
        gender: data.gender ?? null,
        avatarUrl: null,
        documentUrl: null,
        documentName: null,
        email: data.email,
      }
    }

    // No account at all — create NIL_UUID record (user will sign up via email link)
    const [member] = await db
      .insert(schoolMembers)
      .values({
        schoolId,
        userId: NIL_UUID,
        portalRoles: ['teacher'],
        teacherType: data.teacherType,
        isPending: true,
        pendingEmail: normalizedEmail,
        fullName: data.fullName,
        phone: data.phone ?? null,
        gender: data.gender ?? null,
        createdBy: invitedBy,
      })
      .returning()

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
      documentUrl: null,
      documentName: null,
      email: data.email,
    }
  },

  /** Retourne le nouvel email si l'email d'invitation a changé (pour renvoyer l'invitation). */
  async update(schoolId: string, memberId: string, data: UpdateTeacherInput): Promise<{ newEmail: string | null }> {
    const [member] = await db
      .select({ userId: schoolMembers.userId, pendingEmail: schoolMembers.pendingEmail })
      .from(schoolMembers)
      .where(and(eq(schoolMembers.id, memberId), eq(schoolMembers.schoolId, schoolId)))
      .limit(1)

    if (!member) throw new Error('Enseignant introuvable')

    const memberUpdate: Record<string, unknown> = {}

    // L'email n'est modifiable que tant que l'enseignant n'a pas de compte : c'est
    // pendingEmail qui sert à rattacher son inscription (signUpAction). Une fois le
    // compte créé, l'email est son identifiant de connexion — à changer par lui-même.
    const newEmail = data.email && data.email !== member.pendingEmail ? data.email : null
    if (newEmail) {
      if (member.userId !== NIL_UUID) throw new Error('EMAIL_LOCKED')

      const rows = await db.execute(sql`SELECT id FROM auth.users WHERE email = ${newEmail} LIMIT 1`)
      if ((rows as unknown as { id: string }[]).length > 0) throw new Error('EMAIL_HAS_ACCOUNT')

      const [duplicate] = await db
        .select({ id: schoolMembers.id })
        .from(schoolMembers)
        .where(and(eq(schoolMembers.schoolId, schoolId), eq(schoolMembers.pendingEmail, newEmail)))
        .limit(1)
      if (duplicate) throw new Error('EMAIL_TAKEN')

      memberUpdate.pendingEmail = newEmail
    }

    if (data.teacherType !== undefined) memberUpdate.teacherType = data.teacherType
    if (data.isActive !== undefined) memberUpdate.isPending = !data.isActive
    // Tant que le compte réel (profiles) n'existe pas, school_members reste la source de vérité
    if (member.userId === NIL_UUID) {
      if (data.fullName !== undefined) memberUpdate.fullName = data.fullName
      if (data.phone !== undefined) memberUpdate.phone = data.phone
      if (data.gender !== undefined) memberUpdate.gender = data.gender
    }
    if (Object.keys(memberUpdate).length > 0) {
      await db
        .update(schoolMembers)
        .set(memberUpdate)
        .where(eq(schoolMembers.id, memberId))
    }

    // Une fois le compte réel activé, c'est profiles qui fait foi
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

    return { newEmail }
  },

  async removeFromSchool(schoolId: string, memberId: string): Promise<void> {
    await db
      .delete(schoolMembers)
      .where(and(eq(schoolMembers.id, memberId), eq(schoolMembers.schoolId, schoolId)))
  },

  async setDocument(schoolId: string, memberId: string, documentUrl: string, documentName: string): Promise<void> {
    await db
      .update(schoolMembers)
      .set({ documentUrl, documentName })
      .where(and(eq(schoolMembers.id, memberId), eq(schoolMembers.schoolId, schoolId)))
  },

  async removeDocument(schoolId: string, memberId: string): Promise<void> {
    await db
      .update(schoolMembers)
      .set({ documentUrl: null, documentName: null })
      .where(and(eq(schoolMembers.id, memberId), eq(schoolMembers.schoolId, schoolId)))
  },
}
