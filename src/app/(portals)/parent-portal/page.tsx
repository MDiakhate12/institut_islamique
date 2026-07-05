import { requireSession } from '@/lib/auth/session'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ParentDashboard } from './ParentDashboard'

export default async function ParentPortalPage() {
  const session = await requireSession()

  const [profileResult] = await db
    .select({ fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.userId, session.userId))
    .limit(1)

  return <ParentDashboard userFullName={profileResult?.fullName ?? null} />
}
