import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { canAccess } from '@/lib/auth/permissions'
import { BudgetClient } from './BudgetClient'

export const metadata = { title: 'Budget — Qaf School' }

export default async function BudgetPage() {
  const session = await requireSession()
  if (!canAccess(session, 'budget')) redirect('/admin-portal')
  return <BudgetClient />
}
