import { requireSession } from '@/lib/auth/session'
import { homeworkService } from '@/modules/homework/homework.service'
import { schoolService } from '@/modules/school/school.service'
import { latestSchoolDayISO, todayInTimeZone } from '@/lib/dates'
import HomeworkTrackingClient from './HomeworkTrackingClient'

export default async function AdminHomeworkPage() {
  const session = await requireSession()
  const school  = await schoolService.getById(session.schoolId)
  const schoolDays = school?.settings?.schoolDays ?? []
  const timeZone = school?.timezone ?? 'UTC'
  const initialDate = latestSchoolDayISO(todayInTimeZone(timeZone), schoolDays)

  const overview = await homeworkService.getAdminOverview(session.schoolId, initialDate)

  return (
    <HomeworkTrackingClient
      initialOverview={overview}
      initialDate={initialDate}
      schoolName={school?.name ?? ''}
      schoolDays={schoolDays}
      timeZone={timeZone}
    />
  )
}
