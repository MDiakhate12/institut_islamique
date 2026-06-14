import { requireAdmin } from '@/lib/auth/session'
import { SchoolSettingsClient } from './SchoolSettingsClient'

export default async function SchoolSettingsPage() {
  await requireAdmin()
  return <SchoolSettingsClient />
}
