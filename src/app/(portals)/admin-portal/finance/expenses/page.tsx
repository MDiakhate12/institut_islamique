import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { canAccess } from '@/lib/auth/permissions'
import { ExpensesClient } from './ExpensesClient'

export const metadata = { title: 'Dépenses — Qaf School' }

export default async function ExpensesPage() {
  const session = await requireSession()
  if (!canAccess(session, 'expenses')) redirect('/admin-portal')
  return <ExpensesClient />
}
