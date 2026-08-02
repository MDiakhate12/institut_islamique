import { db } from '@/db'
import { schools, schoolMembers } from '@/db/schema'
import { DEFAULT_SETTINGS } from '@/db/schema/schools'
import { and, eq, inArray } from 'drizzle-orm'

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

export const superAdminService = {
  async createSchoolWithAdmin(data: {
    schoolName: string
    schoolSlug: string
    adminEmail: string
  }) {
    const [school] = await db
      .insert(schools)
      .values({
        name: data.schoolName,
        slug: data.schoolSlug,
        settings: { ...DEFAULT_SETTINGS, onboardingCompleted: false },
      })
      .returning()

    const [member] = await db
      .insert(schoolMembers)
      .values({
        schoolId:     school.id,
        userId:       NIL_UUID,
        portalRoles:  ['admin'],
        adminSubRole: 'admin',
        isPending:    true,
        pendingEmail: data.adminEmail.toLowerCase(),
      })
      .returning()

    return { school, member }
  },

  async getAllSchools() {
    const allSchools = await db
      .select({
        id:        schools.id,
        name:      schools.name,
        slug:      schools.slug,
        settings:  schools.settings,
        createdAt: schools.createdAt,
      })
      .from(schools)
      .orderBy(schools.createdAt)

    if (allSchools.length === 0) return []

    const allMembers = await db
      .select({
        schoolId:     schoolMembers.schoolId,
        id:           schoolMembers.id,
        portalRoles:  schoolMembers.portalRoles,
        isPending:    schoolMembers.isPending,
        pendingEmail: schoolMembers.pendingEmail,
      })
      .from(schoolMembers)
      .where(inArray(schoolMembers.schoolId, allSchools.map(s => s.id)))

    const membersBySchool = new Map<string, typeof allMembers>()
    for (const m of allMembers) {
      if (!membersBySchool.has(m.schoolId)) membersBySchool.set(m.schoolId, [])
      membersBySchool.get(m.schoolId)!.push(m)
    }

    return allSchools.map(s => {
      const members = membersBySchool.get(s.id) ?? []
      const pendingAdmin = members.find(
        m => m.isPending && m.portalRoles?.includes('admin') && m.pendingEmail
      )
      return {
        id:                   s.id,
        name:                 s.name,
        slug:                 s.slug,
        settings:             s.settings,
        createdAt:            s.createdAt,
        memberCount:          members.length,
        pendingAdminEmail:    pendingAdmin?.pendingEmail ?? null,
        pendingAdminMemberId: pendingAdmin?.id ?? null,
      }
    })
  },

  async deleteSchool(schoolId: string) {
    await db.delete(schools).where(eq(schools.id, schoolId))
  },

  async updateSchoolBasic(schoolId: string, data: { name: string; slug: string }) {
    await db
      .update(schools)
      .set({ name: data.name, slug: data.slug, updatedAt: new Date() })
      .where(eq(schools.id, schoolId))
  },

  async getSchoolName(schoolId: string): Promise<string | null> {
    const [row] = await db
      .select({ name: schools.name })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1)
    return row?.name ?? null
  },

  async getPendingAdminEmail(schoolId: string): Promise<string | null> {
    const [row] = await db
      .select({ pendingEmail: schoolMembers.pendingEmail })
      .from(schoolMembers)
      .where(
        and(
          eq(schoolMembers.schoolId, schoolId),
          eq(schoolMembers.isPending, true),
          eq(schoolMembers.userId, NIL_UUID),
        )
      )
      .limit(1)
    return row?.pendingEmail ?? null
  },
}
