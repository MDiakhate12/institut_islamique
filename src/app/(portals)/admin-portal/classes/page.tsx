import { requireSession } from '@/lib/auth/session'
import { ClassesClient } from './ClassesClient'

export const metadata = { title: 'Classes — Qaf School' }

export default async function ClassesPage() {
  await requireSession()
  return <ClassesClient />
}
