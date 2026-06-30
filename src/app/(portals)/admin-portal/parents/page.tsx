import { requireSession } from '@/lib/auth/session'
import { parentsService } from '@/modules/parents/parents.service'
import { db } from '@/db'
import { schools } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ParentsClient } from './ParentsClient'

export default async function ParentsPage() {
  const session = await requireSession()

  const [[school], parents] = await Promise.all([
    db.select({ name: schools.name }).from(schools).where(eq(schools.id, session.schoolId)).limit(1),
    parentsService.getAll(session.schoolId),
  ])

  return <ParentsClient parents={parents} schoolName={school?.name ?? ''} />
}
