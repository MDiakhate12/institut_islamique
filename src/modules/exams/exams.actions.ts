'use server'

import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { examsService } from './exams.service'
import { submitExamSchema, signGradeSchema } from './exams.schema'
import type {
  TeacherExamClass, ExamResult, GradeFormStudent,
  AdminExamClassProgress, AdminExamStudentProgress,
  ParentChildExamData,
} from './exams.types'

export async function getTeacherExamClassesAction(
  trimester: number,
): Promise<ActionResult<TeacherExamClass[]>> {
  const session = await requireSession()
  if (!session.roles.includes('teacher')) return err('Non autorisé')
  try {
    const data = await examsService.getTeacherClasses(session.memberId, session.schoolId, trimester)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement des classes')
  }
}

export async function getStudentForGradeFormAction(
  studentId: string,
  classId: string,
): Promise<ActionResult<GradeFormStudent>> {
  const session = await requireSession()
  if (!session.roles.includes('teacher')) return err('Non autorisé')
  try {
    const data = await examsService.getStudentForGradeForm(studentId, classId, session.schoolId)
    if (!data) return err('Élève ou classe introuvable')
    return ok(data)
  } catch {
    return err('Erreur lors du chargement')
  }
}

export async function getExamResultAction(
  classId: string,
  studentId: string,
  trimester: number,
): Promise<ActionResult<ExamResult | null>> {
  const session = await requireSession()
  try {
    const data = await examsService.getExamResult(classId, studentId, session.schoolId, trimester)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement de la note')
  }
}

export async function submitExamResultAction(
  raw: unknown,
): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('teacher')) return err('Non autorisé')
  const parsed = submitExamSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    await examsService.submitExamResult(session.schoolId, session.memberId, parsed.data)
    return ok(undefined)
  } catch {
    return err('Erreur lors de la soumission de la note')
  }
}

export async function getAdminExamClassesAction(
  trimester: number,
): Promise<ActionResult<AdminExamClassProgress[]>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return err('Non autorisé')
  try {
    const data = await examsService.getClassesWithProgress(session.schoolId, trimester)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement')
  }
}

export async function getAdminExamStudentsAction(
  trimester: number,
): Promise<ActionResult<AdminExamStudentProgress[]>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return err('Non autorisé')
  try {
    const data = await examsService.getStudentsWithProgress(session.schoolId, trimester)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement')
  }
}

export async function getParentChildrenGradesAction(
  trimester: number,
): Promise<ActionResult<ParentChildExamData[]>> {
  const session = await requireSession()
  if (!session.roles.includes('parent')) return err('Non autorisé')
  try {
    const data = await examsService.getChildrenGrades(session.memberId, session.schoolId, trimester)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement des bulletins')
  }
}

export async function signExamGradeAction(
  examResultId: string,
  parentSignature: string,
): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('parent')) return err('Non autorisé')
  const parsed = signGradeSchema.safeParse({ examResultId, parentSignature })
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    await examsService.signGrade(examResultId, parentSignature, session.schoolId)
    return ok(undefined)
  } catch {
    return err('Erreur lors de la signature')
  }
}
