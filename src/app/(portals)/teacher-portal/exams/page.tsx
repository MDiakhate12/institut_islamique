import { requireSession } from '@/lib/auth/session'
import { examsService } from '@/modules/exams/exams.service'
import { schoolService } from '@/modules/school/school.service'
import { ExamsClient } from './ExamsClient'

export default async function TeacherExamsPage() {
  const session = await requireSession()
  const school = await schoolService.getById(session.schoolId)
  const initialTrimester = school?.settings?.currentTrimester ?? 1
  const s = school?.settings
  const examPeriodT1Open = s?.examPeriodT1Open ?? false
  const examPeriodT2Open = s?.examPeriodT2Open ?? false
  const examPeriodT3Open = s?.examPeriodT3Open ?? false
  const academicYear = school?.settings?.academicYear ?? ''

  const classes = await examsService.getTeacherClasses(session.memberId, session.schoolId, initialTrimester)

  return (
    <ExamsClient
      initialClasses={classes}
      initialTrimester={initialTrimester}
      academicYear={academicYear}
      examPeriodT1Open={examPeriodT1Open}
      examPeriodT2Open={examPeriodT2Open}
      examPeriodT3Open={examPeriodT3Open}
    />
  )
}
