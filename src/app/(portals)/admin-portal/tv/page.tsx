import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function TvPage() {
  await requireSession()
  return <ComingSoon title="Application Qaf TV" />
}
