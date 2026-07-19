import { requireSession } from '@/lib/auth/session'
import { parentsService } from '@/modules/parents/parents.service'
import { schoolService } from '@/modules/school/school.service'
import { registrationsService } from '@/modules/registrations/registrations.service'
import { EnrollmentSelector } from './EnrollmentSelector'

export default async function EnrollmentSelectPage() {
  const session = await requireSession()

  const [school, memberId] = await Promise.all([
    schoolService.getById(session.schoolId),
    parentsService.getMemberId(session.userId, session.schoolId),
  ])

  const academicYear = school?.settings?.academicYear ?? new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)

  const children = memberId
    ? await parentsService.getChildrenWithClasses(memberId, session.schoolId)
    : []

  const registeredStudentIds = await registrationsService.getRegisteredStudentIds(
    session.schoolId,
    children.map(c => c.studentId),
    academicYear,
  )

  return (
    <EnrollmentSelector
      students={children}
      schoolName={school?.name ?? ''}
      academicYear={academicYear}
      registeredStudentIds={Array.from(registeredStudentIds)}
    />
  )
}
