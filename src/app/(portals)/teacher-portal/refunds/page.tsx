import { requireSession } from '@/lib/auth/session'
import { RefundsClient } from './RefundsClient'

export const metadata = { title: 'Mes remboursements — Qaf School' }

export default async function TeacherRefundsPage() {
  await requireSession()
  return <RefundsClient />
}
