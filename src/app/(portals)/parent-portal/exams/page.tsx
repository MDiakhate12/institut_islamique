import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function ParentExamsPage() {
  await requireSession()
  return <ComingSoon title="Notes d'examen" />
}
