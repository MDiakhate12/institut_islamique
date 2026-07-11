import { db } from '@/db'
import { profiles, schoolMembers, schools } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { PortalRole } from '@/lib/constants'
import type { ProfileData } from './profile.types'

export const profileService = {
  async getProfile(userId: string, schoolId: string): Promise<ProfileData | null> {
    const [row] = await db
      .select({
        memberId:          schoolMembers.id,
        roles:              schoolMembers.portalRoles,
        memberSince:        schoolMembers.createdAt,
        fullName:           profiles.fullName,
        phone:              profiles.phone,
        avatarUrl:          profiles.avatarUrl,
        preferredLanguage:  profiles.preferredLanguage,
        schoolName:         schools.name,
      })
      .from(schoolMembers)
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .leftJoin(schools, eq(schools.id, schoolMembers.schoolId))
      .where(and(eq(schoolMembers.userId, userId), eq(schoolMembers.schoolId, schoolId)))
      .limit(1)

    if (!row) return null

    return {
      userId,
      memberId: row.memberId,
      email: '',
      fullName: row.fullName ?? null,
      phone: row.phone ?? null,
      avatarUrl: row.avatarUrl ?? null,
      preferredLanguage: row.preferredLanguage ?? null,
      schoolName: row.schoolName ?? '',
      roles: (row.roles as PortalRole[]) ?? [],
      memberSince: row.memberSince,
    }
  },

  /** Update name/phone (profiles) and portal roles (school_members), preserving the current admin bit. */
  async updateProfile(
    userId: string,
    memberId: string,
    data: { fullName: string; phone?: string; roles: PortalRole[] },
  ): Promise<void> {
    const [member] = await db
      .select({ roles: schoolMembers.portalRoles })
      .from(schoolMembers)
      .where(eq(schoolMembers.id, memberId))
      .limit(1)
    if (!member) throw new Error('Compte introuvable')

    const currentRoles = (member.roles as PortalRole[]) ?? []
    const hasAdmin = currentRoles.includes('admin')
    const requestedNonAdmin = data.roles.filter(r => r !== 'admin')
    const finalRoles = hasAdmin ? Array.from(new Set(['admin', ...requestedNonAdmin])) : requestedNonAdmin

    if (finalRoles.length === 0) throw new Error('Vous devez conserver au moins un rôle actif')

    await db
      .update(schoolMembers)
      .set({ portalRoles: finalRoles })
      .where(eq(schoolMembers.id, memberId))

    await db
      .update(profiles)
      .set({
        fullName: data.fullName,
        ...(data.phone !== undefined && { phone: data.phone }),
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId))
  },

  async updateLanguage(userId: string, preferredLanguage: string | null): Promise<void> {
    await db
      .update(profiles)
      .set({ preferredLanguage, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
  },
}
