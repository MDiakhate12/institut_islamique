import { requireSession } from '@/lib/auth/session'
import { examsService } from '@/modules/exams/exams.service'
import { schoolService } from '@/modules/school/school.service'
import { ExamsClient } from './ExamsClient'

export default async function TeacherExamsPage() {
  const session = await requireSession()
  const school = await schoolService.getById(session.schoolId)
  const trimester = school?.settings?.currentTrimester ?? 1
  const examPeriodOpen = school?.settings?.examPeriodOpen ?? false
  const academicYear = school?.settings?.academicYear ?? ''

  const classes = await examsService.getTeacherClasses(session.memberId, session.schoolId, trimester)

  return (
    <ExamsClient
      initialClasses={classes}
      trimester={trimester}
      academicYear={academicYear}
      examPeriodOpen={examPeriodOpen}
    />
  )
}
