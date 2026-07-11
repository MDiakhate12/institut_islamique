import { getPublicRegistrationFormAction } from '@/modules/registrations/registrations.actions'
import { PublicRegistrationForm } from './PublicRegistrationForm'
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

  const { form, schoolName, gradeOptions, financialOptions, academicYear, classes } = result.data

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
