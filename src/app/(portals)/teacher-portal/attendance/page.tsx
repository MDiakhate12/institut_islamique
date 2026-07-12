import { requireSession } from '@/lib/auth/session'
import { attendanceService } from '@/modules/attendance/attendance.service'
import AttendanceClient from './AttendanceClient'

export default async function AttendancePage() {
  const session = await requireSession()

  const pinnedClasses = await attendanceService.getPinnedClasses(session.schoolId, session.memberId)
  const classOptions = await attendanceService.getClassOptions(
    session.schoolId,
    session.memberId,
    pinnedClasses.map(p => p.classId),
  )

  const today = new Date().toISOString().split('T')[0]

  return (
    <AttendanceClient
      initialPinnedClasses={pinnedClasses}
      initialClassOptions={classOptions}
      today={today}
    />
  )
}
