import { requireSession } from '@/lib/auth/session'
import { schoolService } from '@/modules/school/school.service'
import { redirect } from 'next/navigation'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const session = await requireSession()

  if (!session.roles.includes('admin')) redirect('/admin-portal')

  const school = await schoolService.getById(session.schoolId)

  if (school?.settings?.onboardingCompleted) redirect('/admin-portal')

  return (
    <OnboardingClient
      schoolId={session.schoolId}
      initialName={school?.name ?? ''}
    />
  )
}
