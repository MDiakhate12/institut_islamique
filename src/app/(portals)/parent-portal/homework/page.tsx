import { requireSession } from '@/lib/auth/session'
import { homeworkService } from '@/modules/homework/homework.service'
import { parentsService } from '@/modules/parents/parents.service'
import { HomeworkClient } from './HomeworkClient'

export default async function ParentHomeworkPage() {
  const session = await requireSession()

  const memberId = await parentsService.getMemberId(session.userId, session.schoolId)
  const { children, homeworkItems } = memberId
    ? await homeworkService.getForParent(session.schoolId, memberId)
    : { children: [], homeworkItems: [] }

  return <HomeworkClient initialChildren={children} initialHomework={homeworkItems} />
}
