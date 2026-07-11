import { notFound, redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { parentsService } from '@/modules/parents/parents.service'
import { schoolService } from '@/modules/school/school.service'
import { registrationsService } from '@/modules/registrations/registrations.service'
import { getPublicRegistrationFormAction } from '@/modules/registrations/registrations.actions'
import { PublicRegistrationForm } from '@/app/portal/register/[schoolSlug]/PublicRegistrationForm'

interface Props {
  params: Promise<{ studentId: string }>
}

export default async function ReenrollChildPage({ params }: Props) {
  const { studentId } = await params
  const session = await requireSession()

  const memberId = await parentsService.getMemberId(session.userId, session.schoolId)
  if (!memberId) notFound()

  const children = await parentsService.getChildrenWithClasses(memberId, session.schoolId)
  const child = children.find(c => c.studentId === studentId)
  if (!child) notFound()

  const registeredStudentIds = await registrationsService.getRegisteredStudentIds(session.schoolId, [studentId])
  if (registeredStudentIds.size > 0) redirect('/parent-portal/enrollment')

  const school = await schoolService.getById(session.schoolId)
  if (!school) notFound()

  const result = await getPublicRegistrationFormAction(school.slug, 'reenrollment')
  if (!result.success) notFound()

  const { form, gradeOptions, financialOptions, academicYear, classes } = result.data

  return (
    <PublicRegistrationForm
      schoolSlug={school.slug}
      schoolName={school.name}
      formType="reenrollment"
      schema={form.formSchema}
      prefilledStudent={{ name: `${child.firstName} ${child.lastName}`, id: child.studentCustomId ?? child.studentId }}
      gradeOptions={gradeOptions}
      financialOptions={financialOptions}
      academicYear={academicYear}
      classes={classes}
      studentId={child.studentId}
      backHref="/parent-portal/enrollment"
      successHref="/parent-portal/enrollment/success"
    />
  )
}
