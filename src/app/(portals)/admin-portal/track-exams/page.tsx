import { requireSession } from '@/lib/auth/session'
import { examsService } from '@/modules/exams/exams.service'
import { schoolService } from '@/modules/school/school.service'
import { TrackExamsClient } from './TrackExamsClient'

export default async function TrackExamsPage() {
  const session = await requireSession()
  const school = await schoolService.getById(session.schoolId)
  const trimester = school?.settings?.currentTrimester ?? 1
  const academicYear = school?.settings?.academicYear ?? ''
  const examPeriodOpen = school?.settings?.examPeriodOpen ?? false
  const schoolName = school?.name ?? ''

  const [classesProg, studentsProg] = await Promise.all([
    examsService.getClassesWithProgress(session.schoolId, trimester),
    examsService.getStudentsWithProgress(session.schoolId, trimester),
  ])

  return (
    <TrackExamsClient
      initialClasses={classesProg}
      initialStudents={studentsProg}
      trimester={trimester}
      academicYear={academicYear}
      examPeriodOpen={examPeriodOpen}
      schoolName={schoolName}
    />
  )
}
