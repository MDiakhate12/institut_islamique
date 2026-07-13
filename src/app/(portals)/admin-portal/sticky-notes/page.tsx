import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function StickyNotesPage() {
  await requireSession()
  return <ComingSoon title="Notes autocollantes" />
}
