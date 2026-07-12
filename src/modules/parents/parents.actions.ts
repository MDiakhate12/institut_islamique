'use server'

import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { sendSmsOtp } from '@/lib/sms'
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
    console.log('[sendDownloadReminderAction] Sending to:', emails, 'Subject:', subject)
    return ok({ sent: emails.length })
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
