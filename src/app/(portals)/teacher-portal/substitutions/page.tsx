import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function TeacherSubstitutionsPage() {
  await requireSession()
  return <ComingSoon title="Portail remplaçant" />
}
