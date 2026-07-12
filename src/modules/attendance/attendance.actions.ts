'use server'

import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { attendanceService } from './attendance.service'
import type {
  PinnedAttendanceClass, AttendanceClassOption,
  AttendanceStudent, SubmitAttendanceInput, ExistingAttendance,
} from './attendance.types'

export async function getPinnedAttendanceClassesAction(): Promise<ActionResult<PinnedAttendanceClass[]>> {
  const session = await requireSession()
  try {
    const data = await attendanceService.getPinnedClasses(session.schoolId, session.memberId)
    return ok(data)
  } catch (e) {
    console.error('[getPinnedAttendanceClassesAction]', e)
    return err('Impossible de charger les classes')
  }
}

export async function getAttendanceClassOptionsAction(): Promise<ActionResult<AttendanceClassOption[]>> {
  const session = await requireSession()
  try {
    const pinned = await attendanceService.getPinnedClasses(session.schoolId, session.memberId)
    const excludeIds = pinned.map(p => p.classId)
    const data = await attendanceService.getClassOptions(session.schoolId, session.memberId, excludeIds)
    return ok(data)
  } catch (e) {
    console.error('[getAttendanceClassOptionsAction]', e)
    return err('Impossible de charger les classes disponibles')
  }
}

export async function addPinnedAttendanceClassAction(classId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await attendanceService.addPinnedClass(session.schoolId, session.memberId, classId)
    return ok(undefined)
  } catch (e) {
    console.error('[addPinnedAttendanceClassAction]', e)
    return err("Impossible d'ajouter la classe")
  }
}

export async function removePinnedAttendanceClassAction(pinnedId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await attendanceService.removePinnedClass(pinnedId)
    return ok(undefined)
  } catch (e) {
    console.error('[removePinnedAttendanceClassAction]', e)
    return err('Impossible de retirer la classe')
  }
}

export async function getAttendanceStudentsAction(classId: string): Promise<ActionResult<AttendanceStudent[]>> {
  const session = await requireSession()
  try {
    const data = await attendanceService.getStudentsByClass(session.schoolId, classId)
    return ok(data)
  } catch (e) {
    console.error('[getAttendanceStudentsAction]', e)
    return err('Impossible de charger les élèves')
  }
}

export async function getExistingAttendanceAction(classId: string, date: string): Promise<ActionResult<ExistingAttendance | null>> {
  const session = await requireSession()
  try {
    const data = await attendanceService.getExisting(session.schoolId, classId, date)
    return ok(data)
  } catch (e) {
    console.error('[getExistingAttendanceAction]', e)
    return err('Impossible de charger les présences')
  }
}

export async function submitAttendanceAction(input: SubmitAttendanceInput): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await attendanceService.submit(session.schoolId, session.memberId, input)
    return ok(undefined)
  } catch (e) {
    console.error('[submitAttendanceAction]', e)
    return err('Impossible de soumettre les présences')
  }
}
