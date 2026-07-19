import { requireSession } from '@/lib/auth/session'
import { examsService } from '@/modules/exams/exams.service'
import { schoolService } from '@/modules/school/school.service'
import { TrackExamsClient } from './TrackExamsClient'

export default async function TrackExamsPage() {
  const session = await requireSession()
  const school = await schoolService.getById(session.schoolId)
  const initialTrimester = school?.settings?.currentTrimester ?? 1
  const academicYear = school?.settings?.academicYear ?? ''
  const s = school?.settings
  const examPeriodT1Open = s?.examPeriodT1Open ?? false
  const examPeriodT2Open = s?.examPeriodT2Open ?? false
  const examPeriodT3Open = s?.examPeriodT3Open ?? false
  const schoolName = school?.name ?? ''

  const [classesProg, studentsProg] = await Promise.all([
    examsService.getClassesWithProgress(session.schoolId, initialTrimester),
    examsService.getStudentsWithProgress(session.schoolId, initialTrimester),
  ])

  return (
    <TrackExamsClient
      initialClasses={classesProg}
      initialStudents={studentsProg}
      initialTrimester={initialTrimester}
      academicYear={academicYear}
      examPeriodT1Open={examPeriodT1Open}
      examPeriodT2Open={examPeriodT2Open}
      examPeriodT3Open={examPeriodT3Open}
      schoolName={schoolName}
    />
  )
}
