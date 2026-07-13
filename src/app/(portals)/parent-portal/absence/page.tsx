import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function ParentAbsencePage() {
  await requireSession()
  return <ComingSoon title="Demande d'absence" />
}
