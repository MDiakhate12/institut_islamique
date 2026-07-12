import { requireSession } from '@/lib/auth/session'
import { teacherClassesService } from '@/modules/teacher-classes/teacher-classes.service'
import MyClassesClient from './MyClassesClient'

export default async function MyClassesPage() {
  const session = await requireSession()
  const myClasses = await teacherClassesService.getMyClasses(session.schoolId, session.memberId)

  return <MyClassesClient initialMyClasses={myClasses} />
}
