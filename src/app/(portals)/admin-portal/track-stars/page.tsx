import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function TrackStarsPage() {
  await requireSession()
  return <ComingSoon title="Suivi des étoiles" />
}
