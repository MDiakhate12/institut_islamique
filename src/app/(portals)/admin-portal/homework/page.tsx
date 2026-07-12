import { requireSession } from '@/lib/auth/session'
import { homeworkService } from '@/modules/homework/homework.service'
import { schoolService } from '@/modules/school/school.service'
import HomeworkTrackingClient from './HomeworkTrackingClient'

const DAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

function latestSchoolDay(schoolDays: string[]): string {
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const iso = d.toISOString().split('T')[0]
    if (schoolDays.length === 0 || schoolDays.some(sd => DAY_INDEX[sd] === d.getDay())) {
      return iso
    }
  }
  return today.toISOString().split('T')[0]
}

export default async function AdminHomeworkPage() {
  const session = await requireSession()
  const school  = await schoolService.getById(session.schoolId)
  const schoolDays = school?.settings?.schoolDays ?? []
  const initialDate = latestSchoolDay(schoolDays)

  const overview = await homeworkService.getAdminOverview(session.schoolId, initialDate)

  return (
    <HomeworkTrackingClient
      initialOverview={overview}
      initialDate={initialDate}
      schoolName={school?.name ?? ''}
      schoolDays={schoolDays}
    />
  )
}
