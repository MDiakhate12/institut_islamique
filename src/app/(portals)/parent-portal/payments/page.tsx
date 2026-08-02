import { requireSession } from '@/lib/auth/session'
import { PaymentStatusClient } from './PaymentStatusClient'

export const metadata = { title: 'Statut de paiement — Qaf School' }

export default async function ParentPaymentsPage() {
  await requireSession()
  return <PaymentStatusClient />
}
