import { requireSession } from '@/lib/auth/session'
import { homeworkService } from '@/modules/homework/homework.service'
import HomeworkClient from './HomeworkClient'

export default async function HomeworkPage() {
  const session = await requireSession()

  const pinnedClasses = await homeworkService.getPinnedClasses(session.schoolId, session.memberId)
  const classOptions = await homeworkService.getClassOptions(
    session.schoolId,
    session.memberId,
    pinnedClasses.map(p => p.classId),
  )

  return (
    <HomeworkClient
      initialPinnedClasses={pinnedClasses}
      initialClassOptions={classOptions}
      schoolId={session.schoolId}
      memberId={session.memberId}
    />
  )
}
