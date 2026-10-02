import { notificationsService } from './notifications.service'
import type { NotificationType } from './notifications.types'
import { getAdminEmails, getAdminMemberIds, sendEmailToAll } from '@/lib/email'

/**
 * Prévient tous les admins/gestionnaires d'une école (trésoriers exclus, cf. getAdminEmails) :
 * notification in-app (cloche) ET e-mail, systématiquement les deux. Une notification in-app
 * reste visible même si l'e-mail échoue. Ne lève jamais : à appeler hors du chemin critique.
 * (Pas un fichier 'use server' : ce n'est pas une Server Action appelable depuis le client.)
 */
export async function notifyAdmins(
  schoolId: string,
  notification: { type: NotificationType; title: string; body?: string; link?: string },
  email: { subject: string; html: string; fromName?: string },
  context: string,
): Promise<void> {
  try {
    const [memberIds, emails] = await Promise.all([getAdminMemberIds(schoolId), getAdminEmails(schoolId)])
    const inApp = await Promise.allSettled(memberIds.map(recipientMemberId =>
      notificationsService.create({ schoolId, recipientMemberId, ...notification })))
    const inAppFailed = inApp.filter(r => r.status === 'rejected').length
    if (inAppFailed > 0) console.error(`[${context}] notifications in-app : ${inAppFailed}/${memberIds.length} échec(s)`)
    await sendEmailToAll(emails, email, context)
  } catch (e) {
    console.error(`[${context}] notifyAdmins :`, e)
  }
}
