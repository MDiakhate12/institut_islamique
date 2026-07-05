import { requireSession } from '@/lib/auth/session'
import { parentsService } from '@/modules/parents/parents.service'
import { ChildrenClient } from './ChildrenClient'

export default async function ChildrenPage() {
  const session = await requireSession()

  const memberId = await parentsService.getMemberId(session.userId, session.schoolId)
  const children = memberId
    ? await parentsService.getChildrenWithClasses(memberId, session.schoolId)
    : []

  return <ChildrenClient initialChildren={children} />
}
