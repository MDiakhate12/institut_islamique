'use server'

import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { sendEmail, getSchoolName } from '@/lib/email'
import { parentsService } from './parents.service'
import type { StudentParentInfo, ChildWithClasses } from './parents.types'

export async function getParentsAction(): Promise<ActionResult<StudentParentInfo[]>> {
  const session = await requireSession()
  try {
    const data = await parentsService.getAll(session.schoolId)
    return ok(data)
  } catch (e) {
    console.error('[getParentsAction]', e)
    return err('Impossible de charger les parents')
  }
}

export async function sendDownloadReminderAction(
  emails: string[],
  subject: string,
): Promise<ActionResult<{ sent: number }>> {
  const session = await requireSession()
  try {
    const schoolName = await getSchoolName(session.schoolId)
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f9f3;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2d6a4f,#2d6a4f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">${schoolName}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Portail de gestion scolaire islamique</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#1e4535;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Nous vous rappelons d'accéder au portail <strong>${schoolName}</strong> pour rester connecté(e)
        aux actualités et au suivi scolaire de votre enfant.
      </p>
    </div>
    <div style="background:#f4f9f3;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">${schoolName} — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body>
</html>`

    const results = await Promise.allSettled(
      emails.map(to => sendEmail({ to, fromName: schoolName, subject, html }))
    )
    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length
    return ok({ sent })
  } catch (e) {
    console.error('[sendDownloadReminderAction]', e)
    return err("Impossible d'envoyer les e-mails")
  }
}

export async function sendOtpAction(email: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    const normalizedEmail = email.toLowerCase().trim()
    const code = await parentsService.generateAndStoreOtp(normalizedEmail)
    const schoolName = await getSchoolName(session.schoolId)

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#7a4f30;padding:32px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:24px;margin:0 0 6px;">${schoolName}</h1>
      <p style="color:rgba(255,255,255,0.8);margin:0;font-size:13px;">Code de vérification</p>
    </div>
    <div style="padding:40px;text-align:center;">
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Utilisez ce code pour lier vos enfants à votre compte parent.
      </p>
      <div style="background:#fdf6f0;border:2px solid #c2440f;border-radius:12px;padding:24px;display:inline-block;margin:0 auto;">
        <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#c2440f;">${code}</span>
      </div>
      <p style="color:#6b7280;font-size:13px;margin:24px 0 0;">
        Ce code expire dans <strong>10 minutes</strong>.
      </p>
    </div>
    <div style="background:#f9f5f0;padding:16px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">${schoolName} — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body>
</html>`

    await sendEmail({
      to: normalizedEmail,
      fromName: schoolName,
      subject: `${code} — Code de vérification ${schoolName}`,
      html,
    })

    return ok(undefined)
  } catch (e) {
    console.error('[sendOtpAction]', e)
    return err("Impossible d'envoyer le code de vérification")
  }
}

export async function verifyOtpAndLinkAction(
  email: string,
  code: string,
): Promise<ActionResult<{ count: number }>> {
  const session = await requireSession()
  try {
    const normalizedEmail = email.toLowerCase().trim()
    const isValid = await parentsService.verifyOtp(normalizedEmail, code)
    if (!isValid) return err('Code invalide ou expiré. Veuillez réessayer.')

    const memberId = await parentsService.getMemberId(session.userId, session.schoolId)
    if (!memberId) return err('Compte parent introuvable dans cette école.')

    const matched = await parentsService.findStudentsByGuardianEmail(normalizedEmail, session.schoolId)
    if (matched.length === 0) {
      return err("Aucun élève trouvé avec cette adresse e-mail. Vérifiez l'adresse enregistrée à l'école.")
    }

    await parentsService.linkStudentsToParent(
      memberId,
      matched.map(s => s.studentId),
      session.schoolId,
    )

    return ok({ count: matched.length })
  } catch (e) {
    console.error('[verifyOtpAndLinkAction]', e)
    return err('Erreur lors de la liaison. Veuillez réessayer.')
  }
}

export async function getChildrenAction(): Promise<ActionResult<ChildWithClasses[]>> {
  const session = await requireSession()
  try {
    const memberId = await parentsService.getMemberId(session.userId, session.schoolId)
    if (!memberId) return ok([])

    const children = await parentsService.getChildrenWithClasses(memberId, session.schoolId)
    return ok(children)
  } catch (e) {
    console.error('[getChildrenAction]', e)
    return err('Impossible de charger les enfants')
  }
}

export async function unlinkChildAction(studentId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    const memberId = await parentsService.getMemberId(session.userId, session.schoolId)
    if (!memberId) return err('Compte parent introuvable')

    await parentsService.unlinkChild(memberId, studentId, session.schoolId)
    return ok(undefined)
  } catch (e) {
    console.error('[unlinkChildAction]', e)
    return err('Impossible de délier cet enfant')
  }
}
