import { requireSession } from '@/lib/auth/session'
import { TeacherAnnouncementsClient } from './AnnouncementsClient'

export default async function TeacherAnnouncementsPage() {
  await requireSession()
  return <TeacherAnnouncementsClient />
}
