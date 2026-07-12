'use server'

import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { teacherClassesService } from './teacher-classes.service'
import type { MyClass } from './teacher-classes.types'

export async function getMyClassesAction(): Promise<ActionResult<MyClass[]>> {
  const session = await requireSession()
  try {
    const data = await teacherClassesService.getMyClasses(session.schoolId, session.memberId)
    return ok(data)
  } catch (e) {
    console.error('[getMyClassesAction]', e)
    return err('Impossible de charger vos classes')
  }
}
