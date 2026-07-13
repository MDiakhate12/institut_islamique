import { requireSession } from '@/lib/auth/session'
import { db } from '@/db'
import { schools } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { PermissionsClient } from './PermissionsClient'

export default async function PermissionsPage() {
  const session = await requireSession()
  const [school] = await db
    .select({ name: schools.name })
    .from(schools)
    .where(eq(schools.id, session.schoolId))
    .limit(1)
  return <PermissionsClient schoolName={school?.name ?? ''} />
}
