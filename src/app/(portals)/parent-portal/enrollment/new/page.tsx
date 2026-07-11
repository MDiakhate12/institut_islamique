import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { parentsService } from '@/modules/parents/parents.service'
import { schoolService } from '@/modules/school/school.service'
import { getPublicRegistrationFormAction } from '@/modules/registrations/registrations.actions'
import { buildKeyToIdMap } from '@/modules/registrations/registrations.service'
import { PublicRegistrationForm } from '@/app/portal/register/[schoolSlug]/PublicRegistrationForm'

export default async function NewChildEnrollmentPage() {
  const session = await requireSession()

  const [school, memberId, profileResult] = await Promise.all([
    schoolService.getById(session.schoolId),
    parentsService.getMemberId(session.userId, session.schoolId),
    db.select({ phone: profiles.phone }).from(profiles).where(eq(profiles.userId, session.userId)).limit(1),
  ])

  if (!school) notFound()

  const result = await getPublicRegistrationFormAction(school.slug, 'new_student')
  if (!result.success) notFound()

  const { form, gradeOptions, financialOptions, academicYear, classes } = result.data

  const keyToId = buildKeyToIdMap(form.formSchema)
  const initialFormData: Record<string, unknown> = {}
  if (keyToId.primaryEmail) initialFormData[keyToId.primaryEmail] = session.email
  const phone = profileResult[0]?.phone
  if (keyToId.primaryPhone && phone) initialFormData[keyToId.primaryPhone] = phone

  return (
    <PublicRegistrationForm
      schoolSlug={school.slug}
      schoolName={school.name}
      formType="new_student"
      schema={form.formSchema}
      gradeOptions={gradeOptions}
      financialOptions={financialOptions}
      academicYear={academicYear}
      classes={classes}
      initialFormData={initialFormData}
      submitterMemberId={memberId ?? undefined}
      backHref="/parent-portal/enrollment"
      successHref="/parent-portal/enrollment/success"
    />
  )
}
