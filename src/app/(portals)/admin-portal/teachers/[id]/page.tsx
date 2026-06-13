import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { teachersService } from '@/modules/teachers/teachers.service'
import { db } from '@/db'
import { classes } from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { TeacherDetailClient } from './TeacherDetailClient'

interface TeacherDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TeacherDetailPage({ params }: TeacherDetailPageProps) {
  const { id } = await params
  const session = await requireSession()

  const teacher = await teachersService.getById(session.schoolId, id)
  if (!teacher) notFound()

  // Compter les classes actives de cet enseignant
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(classes)
    .where(
      and(
        eq(classes.schoolId, session.schoolId),
        eq(classes.teacherId, teacher.id),
        eq(classes.isActive, true),
      )
    )

  return <TeacherDetailClient teacher={teacher} classCount={count ?? 0} />
}
