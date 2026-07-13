import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function RankingsPage() {
  await requireSession()
  return <ComingSoon title="Classement" />
}
