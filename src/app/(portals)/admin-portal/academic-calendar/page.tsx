import { requireSession } from '@/lib/auth/session'
import { AcademicCalendarClient } from './AcademicCalendarClient'

export default async function AcademicCalendarPage() {
  await requireSession()
  return <AcademicCalendarClient />
}
