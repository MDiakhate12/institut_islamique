'use server'

import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { parentsService } from './parents.service'
import type { StudentParentInfo } from './parents.types'

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
    // TODO: send via Resend when RESEND_API_KEY is configured
    console.log('[sendDownloadReminderAction] Sending to:', emails, 'Subject:', subject)
    return ok({ sent: emails.length })
  } catch (e) {
    console.error('[sendDownloadReminderAction]', e)
    return err("Impossible d'envoyer les e-mails")
  }
}
