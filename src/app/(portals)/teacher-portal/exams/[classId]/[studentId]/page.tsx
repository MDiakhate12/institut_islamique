import { requireSession } from '@/lib/auth/session'
import { examsService } from '@/modules/exams/exams.service'
import { schoolService } from '@/modules/school/school.service'
import { notFound } from 'next/navigation'
import { GradeFormClient } from './GradeFormClient'

interface Props {
  params: Promise<{ classId: string; studentId: string }>
}

export default async function GradeFormPage({ params }: Props) {
  const { classId, studentId } = await params
  const session = await requireSession()
  const school = await schoolService.getById(session.schoolId)
  const trimester = school?.settings?.currentTrimester ?? 1
  const academicYear = school?.settings?.academicYear ?? null

  const [info, existing] = await Promise.all([
    examsService.getStudentForGradeForm(studentId, classId, session.schoolId),
    examsService.getExamResult(classId, studentId, session.schoolId, trimester),
  ])

  if (!info) notFound()

  return (
    <GradeFormClient
      info={info}
      existing={existing}
      trimester={trimester}
      academicYear={academicYear}
    />
  )
}
