import { requireSession } from '@/lib/auth/session'
import { attendanceService } from '@/modules/attendance/attendance.service'
import { schoolService } from '@/modules/school/school.service'
import { todayInTimeZone } from '@/lib/dates'
import AttendanceClient from './AttendanceClient'

export default async function AttendancePage() {
  const session = await requireSession()

  const pinnedClasses = await attendanceService.getPinnedClasses(session.schoolId, session.memberId)
  const classOptions = await attendanceService.getClassOptions(
    session.schoolId,
    session.memberId,
    pinnedClasses.map(p => p.classId),
  )

  // Fuseau de l'école, pas celui du serveur (UTC) : un appel à 0 h 30 compte pour aujourd'hui
  const school = await schoolService.getById(session.schoolId)
  const today = todayInTimeZone(school?.timezone)

  return (
    <AttendanceClient
      initialPinnedClasses={pinnedClasses}
      initialClassOptions={classOptions}
      today={today}
    />
  )
}
