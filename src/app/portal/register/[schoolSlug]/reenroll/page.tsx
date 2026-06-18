import { getPublicRegistrationFormAction } from '@/modules/registrations/registrations.actions'
import { PublicRegistrationForm } from '../PublicRegistrationForm'
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

  const { form, schoolName, gradeOptions, academicYear } = result.data

  // In preview mode, show mock student data
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
      academicYear={academicYear}
    />
  )
}
