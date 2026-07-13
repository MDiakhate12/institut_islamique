import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function TeacherExamsPage() {
  await requireSession()
  return <ComingSoon title="Soumettre les notes d'examen" />
}
