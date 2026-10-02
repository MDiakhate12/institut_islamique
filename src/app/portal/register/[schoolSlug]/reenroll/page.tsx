import { getPublicRegistrationFormAction } from '@/modules/registrations/registrations.actions'
import { PublicRegistrationForm } from '../PublicRegistrationForm'
import { RegistrationNotice } from '../RegistrationNotice'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ schoolSlug: string }>
  searchParams: Promise<{ preview?: string }>
}

export default async function ReenrollmentPage({ params, searchParams }: Props) {
  const { schoolSlug } = await params
  const { preview }    = await searchParams

  const result = await getPublicRegistrationFormAction(schoolSlug, 'reenrollment')
  if (!result.success) notFound()

  const { form, schoolName, gradeOptions, financialOptions, academicYear, classes } = result.data

  // Hors aperçu admin : la réinscription se fait depuis le portail parent, où l'élève est identifié
  // (ici on ne sait pas de quel élève il s'agit — l'envoi créait une inscription sans élève)
  if (preview !== 'true') {
    return (
      <RegistrationNotice
        schoolName={schoolName}
        title="Réinscription depuis le portail parent"
        message="Pour réinscrire votre enfant, connectez-vous au portail parent : il apparaîtra dans votre liste et le formulaire sera pré-rempli. Pas encore de compte ? Créez-le, puis liez votre enfant avec le numéro de téléphone donné à l'école."
        links={[
          { href: '/auth/login?redirect=/parent-portal/enrollment', label: 'Se connecter' },
          { href: '/auth/signup', label: 'Créer un compte' },
        ]}
      />
    )
  }

  // Aperçu admin (form builder) : élève fictif
  const prefilledStudent = preview === 'true'
    ? { name: 'Mock Student (Preview)', id: '12345' }
    : undefined

  return (
    <PublicRegistrationForm
      schoolSlug={schoolSlug}
      schoolName={schoolName}
      formType="reenrollment"
      schema={form.formSchema}
      isPreview={preview === 'true'}
      prefilledStudent={prefilledStudent}
      gradeOptions={gradeOptions}
      financialOptions={financialOptions}
      academicYear={academicYear}
      classes={classes}
    />
  )
}
