import { requireSession } from '@/lib/auth/session'
import { parentsService } from '@/modules/parents/parents.service'
import { schoolService } from '@/modules/school/school.service'
import { registrationsService } from '@/modules/registrations/registrations.service'
import { EnrollmentSelector } from './EnrollmentSelector'

export default async function EnrollmentSelectPage() {
  const session = await requireSession()

  const memberId = await parentsService.getMemberId(session.userId, session.schoolId)
  const children = memberId
    ? await parentsService.getChildrenWithClasses(memberId, session.schoolId)
    : []

  const [school, registeredStudentIds] = await Promise.all([
    schoolService.getById(session.schoolId),
    registrationsService.getRegisteredStudentIds(session.schoolId, children.map(c => c.studentId)),
  ])

  return (
    <EnrollmentSelector
      students={children}
      schoolName={school?.name ?? ''}
      academicYear={school?.settings?.academicYear ?? '2026-2027'}
      registeredStudentIds={Array.from(registeredStudentIds)}
    />
  )
}
