'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { homeworkService } from './homework.service'
import { createHomeworkSchema, updateHomeworkSchema } from './homework.schema'
import type { HomeworkItem, PinnedClass, ClassOption, VirtualSession, HomeworkStudent } from './homework.types'

const path = '/teacher-portal/homework'

export async function getPinnedClassesAction(): Promise<ActionResult<PinnedClass[]>> {
  const session = await requireSession()
  try {
    const data = await homeworkService.getPinnedClasses(session.schoolId, session.memberId)
    return ok(data)
  } catch (e) {
    console.error('[getPinnedClassesAction]', e)
    return err('Impossible de charger les classes')
  }
}

export async function getClassOptionsAction(): Promise<ActionResult<ClassOption[]>> {
  const session = await requireSession()
  try {
    const pinned = await homeworkService.getPinnedClasses(session.schoolId, session.memberId)
    const excludeIds = pinned.map(p => p.classId)
    const data = await homeworkService.getClassOptions(session.schoolId, session.memberId, excludeIds)
    return ok(data)
  } catch (e) {
    console.error('[getClassOptionsAction]', e)
    return err('Impossible de charger les classes disponibles')
  }
}

export async function addPinnedClassAction(classId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await homeworkService.addPinnedClass(session.schoolId, session.memberId, classId)
    revalidatePath(path)
    return ok(undefined)
  } catch (e) {
    console.error('[addPinnedClassAction]', e)
    return err("Impossible d'ajouter la classe")
  }
}

export async function removePinnedClassAction(pinnedId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await homeworkService.removePinnedClass(pinnedId)
    revalidatePath(path)
    return ok(undefined)
  } catch (e) {
    console.error('[removePinnedClassAction]', e)
    return err('Impossible de retirer la classe')
  }
}

export async function getHomeworkByClassAction(classId: string): Promise<ActionResult<HomeworkItem[]>> {
  const session = await requireSession()
  try {
    const data = await homeworkService.getByClass(session.schoolId, classId)
    return ok(data)
  } catch (e) {
    console.error('[getHomeworkByClassAction]', e)
    return err('Impossible de charger les devoirs')
  }
}

export async function createHomeworkAction(input: unknown): Promise<ActionResult<HomeworkItem>> {
  const session = await requireSession()
  const parsed = createHomeworkSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    const item = await homeworkService.create(session.schoolId, session.memberId, parsed.data)
    revalidatePath(path)
    return ok(item)
  } catch (e) {
    console.error('[createHomeworkAction]', e)
    return err('Impossible de créer le devoir')
  }
}

export async function updateHomeworkAction(
  homeworkId: string,
  input: unknown,
): Promise<ActionResult<void>> {
  const session = await requireSession()
  const parsed = updateHomeworkSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    await homeworkService.update(homeworkId, session.schoolId, parsed.data)
    revalidatePath(path)
    return ok(undefined)
  } catch (e) {
    console.error('[updateHomeworkAction]', e)
    return err('Impossible de modifier le devoir')
  }
}

export async function deleteHomeworkAction(homeworkId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await homeworkService.delete(homeworkId, session.schoolId)
    revalidatePath(path)
    return ok(undefined)
  } catch (e) {
    console.error('[deleteHomeworkAction]', e)
    return err('Impossible de supprimer le devoir')
  }
}

export async function getHomeworkStudentsAction(classId: string): Promise<ActionResult<HomeworkStudent[]>> {
  const session = await requireSession()
  try {
    const data = await homeworkService.getStudentsByClass(session.schoolId, classId)
    return ok(data)
  } catch (e) {
    console.error('[getHomeworkStudentsAction]', e)
    return err('Impossible de charger les élèves')
  }
}

export async function getActiveSessionAction(classId: string): Promise<ActionResult<VirtualSession | null>> {
  const session = await requireSession()
  try {
    const data = await homeworkService.getActiveSession(session.schoolId, classId)
    return ok(data)
  } catch (e) {
    console.error('[getActiveSessionAction]', e)
    return err('Impossible de charger la session')
  }
}

export async function createVirtualSessionAction(classId: string): Promise<ActionResult<VirtualSession>> {
  const session = await requireSession()
  try {
    const data = await homeworkService.createVirtualSession(session.schoolId, classId, session.memberId)
    revalidatePath(path)
    return ok(data)
  } catch (e) {
    console.error('[createVirtualSessionAction]', e)
    return err('Impossible de créer la session virtuelle')
  }
}

export async function endVirtualSessionAction(sessionId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await homeworkService.endVirtualSession(sessionId, session.schoolId)
    revalidatePath(path)
    return ok(undefined)
  } catch (e) {
    console.error('[endVirtualSessionAction]', e)
    return err('Impossible de terminer la session')
  }
}
