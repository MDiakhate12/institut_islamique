import { requireSession } from '@/lib/auth/session'
import { AdminAttendanceClient } from './AdminAttendanceClient'

export default async function AdminAttendancePage() {
  await requireSession()
  return <AdminAttendanceClient />
}
