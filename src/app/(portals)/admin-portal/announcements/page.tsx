import { requireSession } from '@/lib/auth/session'
import { db } from '@/db'
import { schools } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { AnnouncementsClient } from './AnnouncementsClient'

export default async function AnnouncementsPage() {
  const session = await requireSession()
  const [school] = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, session.schoolId))
  return <AnnouncementsClient schoolName={school?.name ?? 'votre école'} />
}
