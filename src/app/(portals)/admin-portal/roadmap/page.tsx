import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function RoadmapPage() {
  await requireSession()
  return <ComingSoon title="Feuille de route & Nouveautés" />
}
