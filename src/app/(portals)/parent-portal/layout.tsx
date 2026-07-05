import { requireSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { ParentSidebar } from '@/components/layouts/ParentSidebar/ParentSidebar'
import { db } from '@/db'
import { schools, profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function ParentPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  if (!session.roles.includes('parent')) {
    redirect('/admin-portal')
  }

  const [schoolResult, profileResult] = await Promise.all([
    db.select({ name: schools.name }).from(schools).where(eq(schools.id, session.schoolId)).limit(1),
    db.select({ fullName: profiles.fullName }).from(profiles).where(eq(profiles.userId, session.userId)).limit(1),
  ])

  const schoolName = schoolResult[0]?.name
  const userFullName = profileResult[0]?.fullName ?? null

  return (
    <div className="flex h-[100dvh]">
      <ParentSidebar session={session} userFullName={userFullName} schoolName={schoolName} />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <div className="flex-1 bg-[#FFF8F0] min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )
}
