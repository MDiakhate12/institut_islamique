import { requireSession } from '@/lib/auth/session'
import { examsService } from '@/modules/exams/exams.service'
import { schoolService } from '@/modules/school/school.service'
import { profileService } from '@/modules/profile/profile.service'
import { ExamsClient } from './ExamsClient'

export default async function ParentExamsPage() {
  const session = await requireSession()
  const [school, profile] = await Promise.all([
    schoolService.getById(session.schoolId),
    profileService.getProfile(session.userId, session.schoolId),
  ])
  const trimester = school?.settings?.currentTrimester ?? 1
  const academicYear = school?.settings?.academicYear ?? ''
  const parentName = profile?.fullName ?? session.email

  const children = await examsService.getChildrenGrades(session.memberId, session.schoolId, trimester)

  return (
    <ExamsClient
      initialChildren={children}
      trimester={trimester}
      academicYear={academicYear}
      parentName={parentName}
    />
  )
}
