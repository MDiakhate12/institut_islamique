'use server'

import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { examsService } from './exams.service'
import { submitExamSchema, signGradeSchema } from './exams.schema'
import { sendEmail, getAdminEmails } from '@/lib/email'
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
    getAdminEmails(session.schoolId).then(emails =>
      Promise.allSettled(emails.map(to => sendEmail({
        to,
        subject: `Qaf School — Notes soumises (Trimestre ${parsed.data.trimester})`,
        html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf6f0;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7a4f30,#c2440f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">Qaf School</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Notes d'examen soumises</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#5c3820;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Un enseignant vient de soumettre des notes d'examen pour le <strong>Trimestre ${parsed.data.trimester}</strong>. Consultez le suivi des examens pour les détails.
      </p>
      <div style="text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin-portal/track-exams" style="display:inline-block;background:#c2440f;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Voir les examens →
        </a>
      </div>
    </div>
    <div style="background:#fdf6f0;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Qaf School — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body></html>`,
      })))
    ).catch(() => {})
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
