import { requireSession } from '@/lib/auth/session'
import { ProfileSettingsClient } from '@/components/shared/ProfileSettingsClient'

export default async function ParentProfilePage() {
  await requireSession()
  return <ProfileSettingsClient />
}
