import { requireSession } from '@/lib/auth/session'
import { ProfileSettingsClient } from '@/components/shared/ProfileSettingsClient'

export default async function TeacherProfilePage() {
  await requireSession()
  return <ProfileSettingsClient />
}
