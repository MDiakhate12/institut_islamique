import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function ParentStarsPage() {
  await requireSession()
  return <ComingSoon title="Étoiles & Trophées" />
}
