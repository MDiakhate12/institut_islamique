import { requireSession } from '@/lib/auth/session'
import { ParentAnnouncementsClient } from './AnnouncementsClient'

export default async function ParentAnnouncementsPage() {
  await requireSession()
  return <ParentAnnouncementsClient />
}
