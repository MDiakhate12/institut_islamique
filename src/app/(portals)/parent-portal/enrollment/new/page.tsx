import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { schoolService } from '@/modules/school/school.service'
import { getPublicRegistrationFormAction } from '@/modules/registrations/registrations.actions'
import { buildKeyToIdMap } from '@/modules/registrations/registrations.service'
import { PublicRegistrationForm } from '@/app/portal/register/[schoolSlug]/PublicRegistrationForm'
import { RegistrationNotice } from '@/app/portal/register/[schoolSlug]/RegistrationNotice'

export default async function NewChildEnrollmentPage() {
  const session = await requireSession()

  const [school, profileResult] = await Promise.all([
    schoolService.getById(session.schoolId),
    db.select({ phone: profiles.phone, fullName: profiles.fullName, gender: profiles.gender }).from(profiles).where(eq(profiles.userId, session.userId)).limit(1),
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

  const keyToId = buildKeyToIdMap(form.formSchema)
  const initialFormData: Record<string, unknown> = {}
  if (keyToId.primaryEmail) initialFormData[keyToId.primaryEmail] = session.email
  const profile = profileResult[0]
  if (keyToId.primaryPhone && profile?.phone) initialFormData[keyToId.primaryPhone] = profile.phone
  // Le parent connecté est pré-rempli comme père ou mère selon le genre de son profil ;
  // à la soumission, le tuteur correspondant est rattaché à son compte
  const parentNameField = profile?.gender === 'male' ? keyToId.fatherName : profile?.gender === 'female' ? keyToId.motherName : undefined
  if (parentNameField && profile?.fullName) initialFormData[parentNameField] = profile.fullName

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
      backHref="/parent-portal/enrollment"
      successHref="/parent-portal/enrollment/success"
    />
  )
}
