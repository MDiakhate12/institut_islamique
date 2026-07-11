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

  const { data: member } = await supabase
    .from('school_members')
    .select('id, school_id, portal_roles, admin_sub_role, is_pending')
    .eq('user_id', user.id)
    .neq('user_id', '00000000-0000-0000-0000-000000000000')
    .single()

  if (!member) return null

  return {
    userId: user.id,
    schoolId: member.school_id,
    memberId: member.id,
    roles: member.portal_roles as PortalRole[],
    adminSubRole: member.admin_sub_role as AdminSubRole | null,
    email: user.email ?? '',
    isPending: member.is_pending ?? false,
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
