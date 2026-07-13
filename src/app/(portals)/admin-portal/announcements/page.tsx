import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function AnnouncementsPage() {
  await requireSession()
  return <ComingSoon title="Annonces" />
}
