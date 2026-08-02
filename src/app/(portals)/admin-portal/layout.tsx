import { requireSession } from '@/lib/auth/session'
import { PortalLayout } from '@/components/layouts/PortalLayout/PortalLayout'
import { db } from '@/db'
import { schools, profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  const [schoolResult, profileResult] = await Promise.all([
    db.select({ name: schools.name }).from(schools).where(eq(schools.id, session.schoolId)).limit(1),
    db.select({ fullName: profiles.fullName }).from(profiles).where(eq(profiles.userId, session.userId)).limit(1),
  ])

  const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(session.email.toLowerCase())

  return (
    <PortalLayout
      session={session}
      schoolName={schoolResult[0]?.name}
      userFullName={profileResult[0]?.fullName ?? null}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </PortalLayout>
  )
}
