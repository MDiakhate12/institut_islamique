import { requireSession } from '@/lib/auth/session'
import { ParentAttendanceClient } from './ParentAttendanceClient'

export default async function ParentAttendancePage() {
  await requireSession()
  return <ParentAttendanceClient />
}
