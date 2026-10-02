import { requireSession } from '@/lib/auth/session'
import { homeworkService } from '@/modules/homework/homework.service'
import { parentsService } from '@/modules/parents/parents.service'
import { schoolService } from '@/modules/school/school.service'
import { todayInTimeZone } from '@/lib/dates'
import { HomeworkClient } from './HomeworkClient'

export default async function ParentHomeworkPage() {
  const session = await requireSession()

  const memberId = await parentsService.getMemberId(session.userId, session.schoolId)
  const { children, homeworkItems } = memberId
    ? await homeworkService.getForParent(session.schoolId, memberId)
    : { children: [], homeworkItems: [] }

  const school = await schoolService.getById(session.schoolId)

  return <HomeworkClient initialChildren={children} initialHomework={homeworkItems} today={todayInTimeZone(school?.timezone)} />
}
