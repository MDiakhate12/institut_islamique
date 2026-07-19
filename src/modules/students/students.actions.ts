'use server'

import { revalidatePath } from 'next/cache'
import { studentsService } from './students.service'
import { createStudentSchema, updateStudentSchema } from './students.schema'
import { requireSession } from '@/lib/auth/session'
import { ok, err, unauthorized } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import type {
  Student, StudentListItem, StudentPayment,
  StudentAttendanceDay, StudentHomeworkItem, StudentReportCardData,
} from './students.types'
import { ROUTES } from '@/lib/constants'

export async function getStudentsAction(): Promise<ActionResult<StudentListItem[]>> {
  const session = await requireSession()
  try {
    const data = await studentsService.getBySchool(session.schoolId)
    return ok(data)
  } catch (e) {
    console.error('[getStudentsAction]', e)
    return err('Impossible de charger les élèves')
  }
}

export async function getStudentAction(studentId: string): Promise<ActionResult<Student>> {
  const session = await requireSession()
  try {
    const student = await studentsService.getById(session.schoolId, studentId)
    if (!student) return err('Élève introuvable')
    return ok(student)
  } catch (e) {
    console.error('[getStudentAction]', e)
    return err('Impossible de charger cet élève')
  }
}

export async function createStudentAction(input: unknown): Promise<ActionResult<Student>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = createStudentSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const student = await studentsService.create(session.schoolId, parsed.data)
    revalidatePath(ROUTES.admin.students)
    return ok(student)
  } catch (e) {
    console.error('[createStudentAction]', e)
    return err("Impossible de créer l'élève. Réessayez.")
  }
}

export async function updateStudentAction(
  studentId: string,
  input: unknown
): Promise<ActionResult<Student>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = updateStudentSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const student = await studentsService.update(session.schoolId, studentId, parsed.data)
    revalidatePath(ROUTES.admin.students)
    revalidatePath(`${ROUTES.admin.students}/${studentId}`)
    return ok(student)
  } catch (e) {
    console.error('[updateStudentAction]', e)
    return err("Impossible de modifier l'élève.")
  }
}

export async function deactivateStudentAction(studentId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    await studentsService.deactivate(session.schoolId, studentId)
    revalidatePath(ROUTES.admin.students)
    return ok(undefined)
  } catch (e) {
    console.error('[deactivateStudentAction]', e)
    return err("Impossible de désactiver l'élève.")
  }
}

export async function deleteStudentAction(studentId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    await studentsService.delete(session.schoolId, studentId)
    revalidatePath(ROUTES.admin.students)
    return ok(undefined)
  } catch (e) {
    console.error('[deleteStudentAction]', e)
    return err("Impossible de supprimer l'élève.")
  }
}

export async function updateStudentNoteAction(
  studentId: string,
  note: string
): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    await studentsService.updateNote(session.schoolId, studentId, note)
    revalidatePath(ROUTES.admin.students)
    return ok(undefined)
  } catch (e) {
    console.error('[updateStudentNoteAction]', e)
    return err('Impossible de sauvegarder le commentaire.')
  }
}

export async function getStudentPaymentsAction(
  studentId: string
): Promise<ActionResult<StudentPayment[]>> {
  const session = await requireSession()
  try {
    const data = await studentsService.getStudentPayments(session.schoolId, studentId)
    return ok(data)
  } catch (e) {
    console.error('[getStudentPaymentsAction]', e)
    return err('Impossible de charger les paiements.')
  }
}

export async function getStudentAttendanceCalendarAction(
  studentId: string
): Promise<ActionResult<StudentAttendanceDay[]>> {
  const session = await requireSession()
  try {
    const data = await studentsService.getStudentAttendanceCalendar(session.schoolId, studentId)
    return ok(data)
  } catch (e) {
    console.error('[getStudentAttendanceCalendarAction]', e)
    return err('Impossible de charger les présences.')
  }
}

export async function getStudentHomeworkAction(
  studentId: string
): Promise<ActionResult<StudentHomeworkItem[]>> {
  const session = await requireSession()
  try {
    const data = await studentsService.getStudentHomework(session.schoolId, studentId)
    return ok(data)
  } catch (e) {
    console.error('[getStudentHomeworkAction]', e)
    return err('Impossible de charger les devoirs.')
  }
}

export async function getActiveClassesAction(): Promise<ActionResult<{
  id: string; classCode: string; name: string; teacherName: string | null
}[]>> {
  const session = await requireSession()
  try {
    const data = await studentsService.getActiveClasses(session.schoolId)
    return ok(data)
  } catch (e) {
    console.error('[getActiveClassesAction]', e)
    return err('Impossible de charger les classes.')
  }
}

export async function getStudentReportCardAction(
  studentId: string
): Promise<ActionResult<StudentReportCardData>> {
  const session = await requireSession()
  try {
    const data = await studentsService.getStudentReportCard(session.schoolId, studentId)
    return ok(data)
  } catch (e) {
    console.error('[getStudentReportCardAction]', e)
    return err('Impossible de charger le bulletin.')
  }
}
