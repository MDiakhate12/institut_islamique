import { getPublicRegistrationFormAction } from '@/modules/registrations/registrations.actions'
import { PublicRegistrationForm } from './PublicRegistrationForm'
import { RegistrationNotice } from './RegistrationNotice'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ schoolSlug: string }>
  searchParams: Promise<{ preview?: string }>
}

export default async function NewStudentRegistrationPage({ params, searchParams }: Props) {
  const { schoolSlug } = await params
  const { preview }    = await searchParams

  const result = await getPublicRegistrationFormAction(schoolSlug, 'new_student')
  if (!result.success) notFound()

  const { form, schoolName, gradeOptions, financialOptions, academicYear, classes, allowNewRegistrations } = result.data

  // Réglage « Autoriser les nouvelles inscriptions » (l'aperçu admin du form builder reste accessible)
  if (!allowNewRegistrations && preview !== 'true') {
    return (
      <RegistrationNotice
        schoolName={schoolName}
        title="Inscriptions fermées"
        message="L'école n'accepte pas de nouvelles inscriptions pour le moment. Contactez-la pour plus d'informations."
        links={[{ href: '/auth/login?redirect=/parent-portal/enrollment', label: 'Réinscrire un enfant (portail parent)' }]}
      />
    )
  }

  return (
    <PublicRegistrationForm
      schoolSlug={schoolSlug}
      schoolName={schoolName}
      formType="new_student"
      schema={form.formSchema}
      isPreview={preview === 'true'}
      gradeOptions={gradeOptions}
      financialOptions={financialOptions}
      academicYear={academicYear}
      classes={classes}
    />
  )
}
