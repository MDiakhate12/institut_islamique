import { requireSession } from '@/lib/auth/session'
import { ComingSoon } from '@/components/shared/ComingSoon'

export default async function SendEmailPage() {
  await requireSession()
  return <ComingSoon title="Envoyer un e-mail" />
}
