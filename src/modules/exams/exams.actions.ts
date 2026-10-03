'use server'

import { requireSession } from '@/lib/auth/session'
import { canAccess } from '@/lib/auth/permissions'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { examsService } from './exams.service'
import { submitExamSchema, signGradeSchema } from './exams.schema'
import { sendEmail, getAppUrl, getSchoolName, getParentEmailsForStudent } from '@/lib/email'
import { notifyAdmins } from '@/modules/notifications/notify-admins'
import { createNotificationInternal } from '@/modules/notifications/notifications.actions'
import type {
  TeacherExamClass, ExamResult, GradeFormStudent,
  AdminExamClassProgress, AdminExamStudentProgress,
  ParentExamView,
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
  // L'UI masque déjà ces cas, mais l'action est appelable directement (URL du formulaire, requête forgée)
  const { classId, studentId, trimester } = parsed.data
  if (!await examsService.canTeacherGrade(session.memberId, classId, studentId, session.schoolId)) {
    return err('Non autorisé')
  }
  if (!await examsService.isExamPeriodOpen(session.schoolId, trimester)) {
    return err(`La période d'examens du Trimestre ${trimester} est fermée`)
  }
  try {
    const { signatureReset } = await examsService.submitExamResult(session.schoolId, session.memberId, parsed.data)
    const [appUrl, schoolName] = await Promise.all([getAppUrl(), getSchoolName(session.schoolId)])
    if (signatureReset) {
      // Hors du chemin critique : un échec de notification ne doit pas faire échouer la notation
      notifyParentsSignatureReset(session.schoolId, studentId, trimester, appUrl, schoolName)
        .catch(e => console.warn('[submitExamResultAction] notification parents :', e))
    }
    void notifyAdmins(session.schoolId, {
      type: 'exam_grades_submitted',
      title: `Notes soumises — Trimestre ${parsed.data.trimester}`,
      body: 'Un enseignant vient de soumettre des notes d\'examen.',
      link: '/admin-portal/track-exams',
    }, {
      fromName: schoolName,
      subject: `${schoolName} — Notes soumises (Trimestre ${parsed.data.trimester})`,
      html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f9f3;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2d6a4f,#2d6a4f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">${schoolName}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Notes d'examen soumises</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#1e4535;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Un enseignant vient de soumettre des notes d'examen pour le <strong>Trimestre ${parsed.data.trimester}</strong>. Consultez le suivi des examens pour les détails.
      </p>
      <div style="text-align:center;">
        <a href="${appUrl}/admin-portal/track-exams" style="display:inline-block;background:#2d6a4f;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Voir les examens →
        </a>
      </div>
    </div>
    <div style="background:#f4f9f3;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">${schoolName} — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body></html>`,
    }, 'submitExamResultAction')
    return ok(undefined)
  } catch {
    return err('Erreur lors de la soumission de la note')
  }
}

export async function getAdminExamClassesAction(
  trimester: number,
): Promise<ActionResult<AdminExamClassProgress[]>> {
  const session = await requireSession()
  if (!canAccess(session, 'track-exams')) return err('Non autorisé')
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
  if (!canAccess(session, 'track-exams')) return err('Non autorisé')
  try {
    const data = await examsService.getStudentsWithProgress(session.schoolId, trimester)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement')
  }
}

export async function getParentChildrenGradesAction(
  trimester: number,
): Promise<ActionResult<ParentExamView>> {
  const session = await requireSession()
  if (!session.roles.includes('parent')) return err('Non autorisé')
  try {
    const data = await examsService.getParentExamView(session.memberId, session.schoolId, trimester)
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
    // Un parent ne signe que les bulletins de ses propres enfants
    const status = await examsService.signGrade(examResultId, parentSignature, session.schoolId, session.memberId)
    if (status === 'forbidden') return err('Non autorisé')
    if (status === 'closed') return err("La période d'examens de ce trimestre est fermée")
    return ok(undefined)
  } catch {
    return err('Erreur lors de la signature')
  }
}

// Bulletin signé puis modifié par l'enseignant : la signature a été annulée, le parent doit re-signer
async function notifyParentsSignatureReset(
  schoolId: string, studentId: string, trimester: number, appUrl: string, schoolName: string,
): Promise<void> {
  const { studentName, parentMemberIds } = await examsService.getStudentParents(studentId, schoolId)
  const title = `Bulletin modifié — ${studentName}`
  const body = `L'enseignant a modifié le bulletin du Trimestre ${trimester}. Merci de le consulter et de le signer à nouveau.`

  await Promise.all(parentMemberIds.map(recipientMemberId => createNotificationInternal({
    schoolId, recipientMemberId, type: 'exam_signature_reset', title, body, link: '/parent-portal/exams',
  })))

  const emails = await getParentEmailsForStudent(studentId)
  await Promise.allSettled(emails.map(to => sendEmail({
    to,
    fromName: schoolName,
    subject: `${schoolName} — ${title}`,
    html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f9f3;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2d6a4f,#2d6a4f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">${schoolName}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Bulletin modifié</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#1e4535;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        L'enseignant a modifié le bulletin du <strong>Trimestre ${trimester}</strong> de <strong>${studentName}</strong>, que vous aviez déjà signé.
        Votre signature a été annulée : merci de consulter la nouvelle version et de la signer à nouveau.
      </p>
      <div style="text-align:center;">
        <a href="${appUrl}/parent-portal/exams" style="display:inline-block;background:#2d6a4f;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Voir le bulletin →
        </a>
      </div>
    </div>
    <div style="background:#f4f9f3;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">${schoolName} — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body></html>`,
  })))
}
