import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function BirthdaysPage() {
  await requireSession()
  return <ComingSoon title="Anniversaires" />
}
