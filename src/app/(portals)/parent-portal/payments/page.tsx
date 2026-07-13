import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function ParentPaymentsPage() {
  await requireSession()
  return <ComingSoon title="Statut de paiement" />
}
