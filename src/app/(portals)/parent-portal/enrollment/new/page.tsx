import { notFound } from 'next/navigation'
import { formatPhone } from '@/lib/phone'
import { requireSession } from '@/lib/auth/session'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { schoolService } from '@/modules/school/school.service'
import { getPublicRegistrationFormAction } from '@/modules/registrations/registrations.actions'
import type { RegistrationGuardianInput } from '@/modules/registrations/registrations.types'
import { PublicRegistrationForm } from '@/app/portal/register/[schoolSlug]/PublicRegistrationForm'
import { RegistrationNotice } from '@/app/portal/register/[schoolSlug]/RegistrationNotice'

export default async function NewChildEnrollmentPage() {
  const session = await requireSession()

  const [school, profileResult] = await Promise.all([
    schoolService.getById(session.schoolId),
    db.select({ phone: profiles.phone, fullName: profiles.fullName }).from(profiles).where(eq(profiles.userId, session.userId)).limit(1),
  ])

  if (!school) notFound()

  const result = await getPublicRegistrationFormAction(school.slug, 'new_student')
  if (!result.success) notFound()

  const { form, gradeOptions, financialOptions, academicYear, classes, allowNewRegistrations } = result.data

  if (!allowNewRegistrations) {
    return (
      <RegistrationNotice
        schoolName={school.name}
        title="Inscriptions fermées"
        message="L'école n'accepte pas de nouvelles inscriptions pour le moment. Contactez-la pour plus d'informations. Vous pouvez toujours réinscrire vos enfants déjà inscrits."
        links={[{ href: '/parent-portal/enrollment', label: 'Retour à mes inscriptions' }]}
      />
    )
  }

  // Bloc « Tuteurs » : tuteur 1 = le parent connecté (données de son compte). Relation
  // « Tuteur légal » par défaut, le parent peut la changer (Père, Mère…)
  const profile = profileResult[0]
  const initialGuardians: RegistrationGuardianInput[] = [{
    relationship:   'guardian',
    name:           profile?.fullName ?? '',
    phone:          formatPhone(profile?.phone),
    email:          session.email,
    emergencyPhone: '',
  }]

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
      initialGuardians={initialGuardians}
      backHref="/parent-portal/enrollment"
      successHref="/parent-portal/enrollment/success"
    />
  )
}
