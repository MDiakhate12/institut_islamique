import { requireSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { TeacherSidebar } from '@/components/layouts/TeacherSidebar/TeacherSidebar'
import { TeacherActivationGate } from '@/components/layouts/TeacherSidebar/TeacherActivationGate'
import { db } from '@/db'
import { schools, profiles, schoolMembers } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { supabaseAdmin } from '@/lib/supabase/admin'

export default async function TeacherPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  if (!session.roles.includes('teacher')) {
    redirect('/admin-portal')
  }

  const [schoolResult, profileResult] = await Promise.all([
    db.select({ name: schools.name }).from(schools).where(eq(schools.id, session.schoolId)).limit(1),
    db.select({ fullName: profiles.fullName }).from(profiles).where(eq(profiles.userId, session.userId)).limit(1),
  ])

  const schoolName = schoolResult[0]?.name
  const userFullName = profileResult[0]?.fullName ?? null

  let adminEmails: string[] = []
  if (session.isPending) {
    // Fetch school admin user IDs for the help section
    const admins = await db
      .select({ userId: schoolMembers.userId })
      .from(schoolMembers)
      .where(
        and(
          eq(schoolMembers.schoolId, session.schoolId),
          sql`'admin' = ANY(${schoolMembers.portalRoles})`
        )
      )
      .limit(10)

    if (admins.length > 0) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
      const adminUserIds = new Set(admins.map(a => a.userId))
      adminEmails = users
        .filter(u => adminUserIds.has(u.id) && u.email)
        .map(u => u.email!)
        .slice(0, 5)
    }
  }

  return (
    <div className="flex h-[100dvh]">
      <TeacherSidebar session={session} userFullName={userFullName} schoolName={schoolName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <div className="flex-1 bg-[#FFF8F0] min-h-0 overflow-y-auto overscroll-contain">
          {session.isPending ? (
            <TeacherActivationGate adminEmails={adminEmails} />
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  )
}
