import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function ParentSchedulePage() {
  await requireSession()
  return <ComingSoon title="Emploi du temps" />
}
