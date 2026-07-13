import { db } from '@/db'
import { schoolMembers, profiles } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { PermissionMember, SearchResult } from './permissions.types'
import type { AdminSubRole } from '@/lib/constants'

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

export const permissionsService = {
  async getByRole(schoolId: string, role: AdminSubRole): Promise<PermissionMember[]> {
    const members = await db
      .select({
        memberId: schoolMembers.id,
        userId: schoolMembers.userId,
        fullName: profiles.fullName,
        phone: profiles.phone,
        portalRoles: schoolMembers.portalRoles,
        adminSubRole: schoolMembers.adminSubRole,
        isPending: schoolMembers.isPending,
        pendingEmail: schoolMembers.pendingEmail,
      })
      .from(schoolMembers)
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(
        and(
          eq(schoolMembers.schoolId, schoolId),
          eq(schoolMembers.adminSubRole, role),
        )
      )

    // Fetch emails from Supabase Auth
    const realUserIds = members.map(m => m.userId).filter(id => id !== NIL_UUID)
    let emailMap = new Map<string, string>()
    if (realUserIds.length > 0) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
      emailMap = new Map(users.filter(u => realUserIds.includes(u.id)).map(u => [u.id, u.email ?? '']))
    }

    return members.map(m => ({
      memberId: m.memberId,
      userId: m.userId,
      fullName: m.fullName,
      email: m.isPending ? (m.pendingEmail ?? '') : (emailMap.get(m.userId) ?? ''),
      phone: m.phone,
      portalRoles: m.portalRoles ?? [],
      adminSubRole: m.adminSubRole as AdminSubRole,
      isPending: m.isPending,
      pendingEmail: m.pendingEmail,
    }))
  },

  async searchByEmail(schoolId: string, email: string, targetRole: AdminSubRole): Promise<SearchResult> {
    const normalizedEmail = email.toLowerCase().trim()

    // Look up in auth.users
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const authUser = users.find(u => (u.email ?? '').toLowerCase() === normalizedEmail)

    if (!authUser) {
      return { found: false, email: normalizedEmail }
    }

    // Check if they have a school_members record
    const [member] = await db
      .select({
        id: schoolMembers.id,
        adminSubRole: schoolMembers.adminSubRole,
        isPending: schoolMembers.isPending,
      })
      .from(schoolMembers)
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(
        and(
          eq(schoolMembers.schoolId, schoolId),
          eq(schoolMembers.userId, authUser.id),
        )
      )
      .limit(1)

    const profile = await db
      .select({ fullName: profiles.fullName, phone: profiles.phone })
      .from(profiles)
      .where(eq(profiles.userId, authUser.id))
      .limit(1)

    return {
      found: true,
      memberId: member?.id,
      fullName: profile[0]?.fullName ?? null,
      email: authUser.email ?? '',
      phone: profile[0]?.phone ?? null,
      alreadyHasRole: member?.adminSubRole === targetRole,
    }
  },

  async grantRole(
    schoolId: string,
    email: string,
    role: AdminSubRole,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim()
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const authUser = users.find(u => (u.email ?? '').toLowerCase() === normalizedEmail)

    if (authUser) {
      // User exists — check for existing school_members record
      const [existing] = await db
        .select({ id: schoolMembers.id })
        .from(schoolMembers)
        .where(and(eq(schoolMembers.schoolId, schoolId), eq(schoolMembers.userId, authUser.id)))
        .limit(1)

      if (existing) {
        // Update adminSubRole and ensure 'admin' is in portalRoles
        await db
          .update(schoolMembers)
          .set({
            adminSubRole: role,
            portalRoles: sql`array_append(
              array_remove(${schoolMembers.portalRoles}, 'admin'),
              'admin'
            )`,
          })
          .where(eq(schoolMembers.id, existing.id))
      } else {
        // Create new school_members record for this school
        await db.insert(schoolMembers).values({
          schoolId,
          userId: authUser.id,
          portalRoles: ['admin'],
          adminSubRole: role,
          isPending: false,
        })
      }
    } else {
      // User doesn't exist — create pending record
      await db.insert(schoolMembers).values({
        schoolId,
        userId: NIL_UUID,
        portalRoles: ['admin'],
        adminSubRole: role,
        isPending: true,
        pendingEmail: normalizedEmail,
      })
    }
  },

  async revokeRole(memberId: string, schoolId: string): Promise<void> {
    const [member] = await db
      .select({ portalRoles: schoolMembers.portalRoles })
      .from(schoolMembers)
      .where(and(eq(schoolMembers.id, memberId), eq(schoolMembers.schoolId, schoolId)))
      .limit(1)

    if (!member) return

    const remainingRoles = (member.portalRoles ?? []).filter((r: string) => r !== 'admin')

    if (remainingRoles.length > 0) {
      // Keep the record but remove admin role + sub-role
      await db
        .update(schoolMembers)
        .set({ adminSubRole: null, portalRoles: remainingRoles })
        .where(eq(schoolMembers.id, memberId))
    } else {
      // Remove the record entirely if they have no other roles
      await db.delete(schoolMembers).where(eq(schoolMembers.id, memberId))
    }
  },
}
