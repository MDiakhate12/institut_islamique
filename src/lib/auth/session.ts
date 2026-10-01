import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PortalRole, AdminSubRole } from '@/lib/constants'

export interface Session {
  userId: string
  schoolId: string
  memberId: string
  roles: PortalRole[]
  adminSubRole: AdminSubRole | null
  email: string
  isPending: boolean
}

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null

  const { data: members } = await supabase
    .from('school_members')
    .select('id, school_id, portal_roles, admin_sub_role, is_pending')
    .eq('user_id', user.id)
    .neq('user_id', '00000000-0000-0000-0000-000000000000')

  if (!members || members.length === 0) return null

  // Prefer the admin record as primary (highest privilege).
  // Legacy users may have two records (teacher + admin) from before the
  // one-record-per-user invariant was enforced — this handles them gracefully.
  const primary =
    members.find(m => (m.portal_roles as string[]).includes('admin')) ??
    members.find(m => (m.portal_roles as string[]).includes('teacher')) ??
    members[0]

  // Aggregate all roles across all records so dual-record users keep both portals
  const allRoles = [...new Set(members.flatMap(m => m.portal_roles as string[]))]

  return {
    userId: user.id,
    schoolId: primary.school_id,
    memberId: primary.id,
    roles: allRoles as PortalRole[],
    adminSubRole: primary.admin_sub_role as AdminSubRole | null,
    email: user.email ?? '',
    isPending: primary.is_pending ?? false,
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/auth/login')
  return session
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) redirect('/admin-portal')
  return session
}
