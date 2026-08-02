'use server'

import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { sendSmsOtp } from '@/lib/sms'
import { sendEmail } from '@/lib/email'
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
  await requireSession()
  try {
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fdf6f0;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7a4f30,#c2440f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">Qaf School</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Application de gestion scolaire islamique</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#5c3820;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Nous vous rappelons de télécharger l'application <strong>Qaf School</strong> pour rester connecté(e)
        aux actualités et au suivi scolaire de votre enfant.
      </p>
      <div style="text-align:center;margin-bottom:32px;">
        <a href="https://qaf.app" style="display:inline-block;background:#c2440f;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Télécharger l'application →
        </a>
      </div>
    </div>
    <div style="background:#fdf6f0;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Qaf School — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body>
</html>`

    const results = await Promise.allSettled(
      emails.map(to => sendEmail({ to, subject, html }))
    )
    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length
    return ok({ sent })
  } catch (e) {
    console.error('[sendDownloadReminderAction]', e)
    return err("Impossible d'envoyer les e-mails")
  }
}

export async function sendOtpAction(phone: string): Promise<ActionResult<void>> {
  await requireSession()
  try {
    const code = await parentsService.generateAndStoreOtp(phone)
    await sendSmsOtp(phone, code)
    return ok(undefined)
  } catch (e) {
    console.error('[sendOtpAction]', e)
    return err("Impossible d'envoyer le code de vérification")
  }
}

export async function verifyOtpAndLinkAction(
  phone: string,
  code: string,
): Promise<ActionResult<{ count: number }>> {
  const session = await requireSession()
  try {
    const isValid = await parentsService.verifyOtp(phone, code)
    if (!isValid) return err('Code invalide ou expiré. Veuillez réessayer.')

    const memberId = await parentsService.getMemberId(session.userId, session.schoolId)
    if (!memberId) return err('Compte parent introuvable dans cette école.')

    const matched = await parentsService.findStudentsByGuardianPhone(phone, session.schoolId)
    if (matched.length === 0) {
      return err('Aucun élève trouvé avec ce numéro. Vérifiez le numéro enregistré à l\'école.')
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
