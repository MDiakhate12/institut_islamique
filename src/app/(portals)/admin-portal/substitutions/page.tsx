import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function SubstitutionsPage() {
  await requireSession()
  return <ComingSoon title="Remplacements" />
}
