import { requireSession } from '@/lib/auth/session'
import { db } from '@/db'
import { schools } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { scheduledClassesService } from '@/modules/classes/classes.service'
import { RegistrationFormsClient } from './RegistrationFormsClient'

export default async function RegistrationFormsPage() {
  const session = await requireSession()

  const [[school], classes] = await Promise.all([
    db.select({ slug: schools.slug }).from(schools).where(eq(schools.id, session.schoolId)).limit(1),
    scheduledClassesService.getForRegistration(session.schoolId),
  ])

  return <RegistrationFormsClient schoolSlug={school?.slug ?? ''} classes={classes} />
}
