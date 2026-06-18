import { requireSession } from '@/lib/auth/session'
import { db } from '@/db'
import { schools } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { RegistrationFormsClient } from './RegistrationFormsClient'

export default async function RegistrationFormsPage() {
  const session = await requireSession()

  const [school] = await db
    .select({ slug: schools.slug })
    .from(schools)
    .where(eq(schools.id, session.schoolId))
    .limit(1)

  const schoolSlug = school?.slug ?? ''

  return <RegistrationFormsClient schoolSlug={schoolSlug} />
}
