'use server'

import { revalidatePath } from 'next/cache'
import { catalogClassesService, scheduledClassesService } from './classes.service'
import {
  createCatalogClassSchema, updateCatalogClassSchema,
  createClassSchema, updateClassSchema,
} from './classes.schema'
import { requireSession } from '@/lib/auth/session'
import { ok, err, unauthorized } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import type { CatalogClass, CatalogClassWithNext, ClassWithDetails, EnrolledStudentInClass } from './classes.types'
import type { Student } from '@/modules/students/students.types'
import { ROUTES } from '@/lib/constants'

const CATALOG_PATH = '/admin-portal/class-catalog'
const CLASSES_PATH = ROUTES.admin.classes

// ── Catalog actions ───────────────────────────────────────────────────────────

export async function getCatalogClassesAction(): Promise<ActionResult<CatalogClassWithNext[]>> {
  await requireSession()
  try {
    const data = await catalogClassesService.getAll()
    return ok(data)
  } catch (e) {
    console.error('[getCatalogClassesAction]', e)
    return err('Impossible de charger le catalogue')
  }
}

export async function createCatalogClassAction(
  input: unknown
): Promise<ActionResult<CatalogClass>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = createCatalogClassSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const row = await catalogClassesService.create(parsed.data)
    revalidatePath(CATALOG_PATH)
    return ok(row)
  } catch (e: unknown) {
    console.error('[createCatalogClassAction]', e)
    const msg = (e as Error)?.message ?? ''
    if (msg.includes('unique')) return err('Ce code de classe existe déjà')
    return err('Impossible de créer la classe')
  }
}

export async function updateCatalogClassAction(
  id: string,
  input: unknown
): Promise<ActionResult<CatalogClass>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = updateCatalogClassSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const row = await catalogClassesService.update(id, parsed.data)
    revalidatePath(CATALOG_PATH)
    return ok(row)
  } catch (e) {
    console.error('[updateCatalogClassAction]', e)
    return err('Impossible de modifier la classe')
  }
}

export async function deleteCatalogClassAction(
  id: string
): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    await catalogClassesService.delete(id)
    revalidatePath(CATALOG_PATH)
    return ok(undefined)
  } catch (e) {
    console.error('[deleteCatalogClassAction]', e)
    return err('Impossible de supprimer la classe')
  }
}

// ── Scheduled class actions ───────────────────────────────────────────────────

export async function getClassesAction(): Promise<ActionResult<ClassWithDetails[]>> {
  const session = await requireSession()
  try {
    const data = await scheduledClassesService.getBySchool(session.schoolId)
    return ok(data)
  } catch (e) {
    console.error('[getClassesAction]', e)
    return err('Impossible de charger les classes')
  }
}

export async function createClassAction(input: unknown): Promise<ActionResult<string>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = createClassSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const id = await scheduledClassesService.create(session.schoolId, parsed.data)
    revalidatePath(CLASSES_PATH)
    return ok(id)
  } catch (e) {
    console.error('[createClassAction]', e)
    return err('Impossible de créer la classe')
  }
}

export async function updateClassAction(id: string, input: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = updateClassSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    await scheduledClassesService.update(session.schoolId, id, parsed.data)
    revalidatePath(CLASSES_PATH)
    return ok(undefined)
  } catch (e) {
    console.error('[updateClassAction]', e)
    return err('Impossible de modifier la classe')
  }
}

export async function deleteClassAction(id: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    await scheduledClassesService.delete(session.schoolId, id)
    revalidatePath(CLASSES_PATH)
    return ok(undefined)
  } catch (e) {
    console.error('[deleteClassAction]', e)
    return err('Impossible de supprimer la classe')
  }
}

export async function getClassEnrollmentsAction(
  classId: string
): Promise<ActionResult<EnrolledStudentInClass[]>> {
  await requireSession()
  try {
    const data = await scheduledClassesService.getEnrollments(classId)
    return ok(data)
  } catch (e) {
    console.error('[getClassEnrollmentsAction]', e)
    return err('Impossible de charger les inscriptions')
  }
}

export async function enrollStudentAction(
  classId: string,
  studentId: string
): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await scheduledClassesService.enrollStudent(session.schoolId, classId, studentId)
    revalidatePath(CLASSES_PATH)
    return ok(undefined)
  } catch (e) {
    console.error('[enrollStudentAction]', e)
    return err("Impossible d'inscrire l'élève")
  }
}

export async function unenrollStudentAction(enrollmentId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()
  try {
    await scheduledClassesService.unenrollStudent(enrollmentId)
    revalidatePath(CLASSES_PATH)
    return ok(undefined)
  } catch (e) {
    console.error('[unenrollStudentAction]', e)
    return err("Impossible de retirer l'élève")
  }
}

export async function transferStudentAction(
  enrollmentId: string,
  newClassId: string
): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await scheduledClassesService.transferStudent(enrollmentId, newClassId, session.schoolId)
    revalidatePath(CLASSES_PATH)
    return ok(undefined)
  } catch (e) {
    console.error('[transferStudentAction]', e)
    return err("Impossible de transférer l'élève")
  }
}

export async function getAvailableStudentsAction(
  classId: string
): Promise<ActionResult<Student[]>> {
  const session = await requireSession()
  try {
    const data = await scheduledClassesService.getAvailableStudents(session.schoolId, classId)
    return ok(data)
  } catch (e) {
    console.error('[getAvailableStudentsAction]', e)
    return err('Impossible de charger les élèves disponibles')
  }
}

export async function getDistinctRoomsAction(): Promise<ActionResult<string[]>> {
  const session = await requireSession()
  try {
    const data = await scheduledClassesService.getDistinctRooms(session.schoolId)
    return ok(data)
  } catch (e) {
    console.error('[getDistinctRoomsAction]', e)
    return err('Impossible de charger les salles')
  }
}
