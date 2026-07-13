import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function BookTrackingPage() {
  await requireSession()
  return <ComingSoon title="Suivi des livres" />
}
