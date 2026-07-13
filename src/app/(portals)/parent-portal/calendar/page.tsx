import { requireSession } from '@/lib/auth/session'
import { AcademicCalendarClient } from '@/app/(portals)/admin-portal/academic-calendar/AcademicCalendarClient'

export default async function ParentCalendarPage() {
  await requireSession()
  return <AcademicCalendarClient readonly />
}
