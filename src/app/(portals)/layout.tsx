import { requireSession } from '@/lib/auth/session'
import { PortalLayout } from '@/components/layouts/PortalLayout/PortalLayout'
import { db } from '@/db'
import { schools } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function PortalsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  // Récupérer le nom de l'école pour l'afficher dans la TopBar
  const [school] = await db
    .select({ name: schools.name })
    .from(schools)
    .where(eq(schools.id, session.schoolId))
    .limit(1)

  return (
    <PortalLayout session={session} schoolName={school?.name}>
      {children}
    </PortalLayout>
  )
}
