'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { canAccess } from '@/lib/auth/permissions'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { ADMIN_SUB_ROLES } from '@/lib/constants'
import type { AdminSubRole } from '@/lib/constants'
import { permissionsService } from './permissions.service'
import type { PermissionMember, SearchResult } from './permissions.types'
import { z } from 'zod'
import { sendEmail, getAppUrl, getSchoolName } from '@/lib/email'
import { createNotificationInternal } from '@/modules/notifications/notifications.actions'
import { getAuthUserIdByEmail } from '@/db/auth-users'
import { db } from '@/db'
import { schoolMembers } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function getPermissionsByRoleAction(
  role: AdminSubRole,
): Promise<ActionResult<PermissionMember[]>> {
  const session = await requireSession()
  if (!canAccess(session, 'permissions')) return err('Non autorisé')
  try {
    const data = await permissionsService.getByRole(session.schoolId, role)
    return ok(data)
  } catch (e) {
    return err('Erreur lors du chargement des autorisations')
  }
}

const searchSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  targetRole: z.enum(['admin', 'treasurer', 'manager']),
})

export async function searchMemberByEmailAction(
  email: string,
  targetRole: AdminSubRole,
): Promise<ActionResult<SearchResult>> {
  const session = await requireSession()
  if (!canAccess(session, 'permissions')) return err('Non autorisé')
  const parsed = searchSchema.safeParse({ email, targetRole })
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    const result = await permissionsService.searchByEmail(session.schoolId, email, targetRole)
    return ok(result)
  } catch (e) {
    return err('Erreur lors de la recherche')
  }
}

const grantSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'treasurer', 'manager']),
})

export async function grantRoleAction(
  email: string,
  role: AdminSubRole,
): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'permissions')) return err('Non autorisé')
  const parsed = grantSchema.safeParse({ email, role })
  if (!parsed.success) return err(parsed.error.issues[0].message)
  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrateur',
    treasurer: 'Trésorier',
    manager: 'Gestionnaire',
  }
  try {
    const { userExists, alreadyHasRole } = await permissionsService.grantRole(session.schoolId, email, role)
    if (alreadyHasRole) {
      return err(userExists
        ? `Cet utilisateur est déjà ${ROLE_LABELS[role] ?? role}`
        : `Une invitation ${ROLE_LABELS[role] ?? role} est déjà en attente pour cet e-mail`)
    }
    revalidatePath('/admin-portal/permissions')
    const [appUrl, schoolName] = await Promise.all([getAppUrl(), getSchoolName(session.schoolId)])
    const ctaUrl = userExists
      ? `${appUrl}/admin-portal`
      : `${appUrl}/auth/signup?invite=admin&schoolId=${session.schoolId}&email=${encodeURIComponent(email)}`
    const ctaLabel = userExists ? 'Accéder au portail →' : 'Créer mon compte →'
    const bodyText = userExists
      ? `Le rôle <strong>${ROLE_LABELS[role] ?? role}</strong> vous a été accordé sur <strong>${schoolName}</strong>. Vous pouvez maintenant accéder au portail d'administration avec ce niveau d'accès.`
      : `Vous avez été invité(e) à rejoindre <strong>${schoolName}</strong> en tant que <strong>${ROLE_LABELS[role] ?? role}</strong>. Créez votre compte pour accéder au portail d'administration.`
    void sendEmail({
      to: email,
      fromName: schoolName,
      subject: `${schoolName} — Invitation ${ROLE_LABELS[role] ?? role}`,
      html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f9f3;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2d6a4f,#2d6a4f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">${schoolName}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Gestion des accès</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#1e4535;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">${bodyText}</p>
      <div style="text-align:center;">
        <a href="${ctaUrl}" style="display:inline-block;background:#2d6a4f;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
          ${ctaLabel}
        </a>
      </div>
    </div>
    <div style="background:#f4f9f3;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">${schoolName} — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body></html>`,
    }).catch(() => {})

    // In-app notification for existing users (pending users have no account yet)
    if (userExists) {
      void (async () => {
        try {
          const normalizedEmail = email.toLowerCase().trim()
          const authUserId = await getAuthUserIdByEmail(normalizedEmail)
          if (authUserId) {
            const [member] = await db
              .select({ id: schoolMembers.id })
              .from(schoolMembers)
              .where(and(eq(schoolMembers.schoolId, session.schoolId), eq(schoolMembers.userId, authUserId)))
              .limit(1)
            if (member) {
              await createNotificationInternal({
                schoolId: session.schoolId,
                recipientMemberId: member.id,
                type: 'role_granted',
                title: `Rôle ${ROLE_LABELS[role] ?? role} accordé`,
                body: `Vous êtes maintenant ${ROLE_LABELS[role] ?? role} sur le portail d'administration.`,
                link: '/admin-portal',
              })
            }
          }
        } catch {}
      })()
    }

    return ok(undefined)
  } catch (e) {
    return err('Erreur lors de l\'attribution du rôle')
  }
}

export async function resendInvitationAction(
  memberId: string,
): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return err('Non autorisé')

  const [member] = await db
    .select({
      pendingEmail:  schoolMembers.pendingEmail,
      adminSubRole:  schoolMembers.adminSubRole,
      isPending:     schoolMembers.isPending,
    })
    .from(schoolMembers)
    .where(and(eq(schoolMembers.id, memberId), eq(schoolMembers.schoolId, session.schoolId)))
    .limit(1)

  if (!member || !member.isPending || !member.pendingEmail) {
    return err('Ce membre n\'est pas en attente ou n\'a pas d\'email enregistré')
  }

  const role = member.adminSubRole as AdminSubRole
  const email = member.pendingEmail
  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrateur', treasurer: 'Trésorier', manager: 'Gestionnaire',
  }

  try {
    const [appUrl, schoolName] = await Promise.all([getAppUrl(), getSchoolName(session.schoolId)])
    const ctaUrl = `${appUrl}/auth/signup?invite=admin&schoolId=${session.schoolId}&email=${encodeURIComponent(email)}`
    void sendEmail({
      to: email,
      fromName: schoolName,
      subject: `${schoolName} — Rappel : Invitation ${ROLE_LABELS[role] ?? role}`,
      html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f9f3;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2d6a4f,#2d6a4f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">${schoolName}</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Gestion des accès</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#1e4535;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Vous avez été invité(e) à rejoindre <strong>${schoolName}</strong> en tant que
        <strong>${ROLE_LABELS[role] ?? role}</strong>. Voici un rappel pour créer votre compte
        et accéder au portail d&apos;administration.
      </p>
      <div style="text-align:center;">
        <a href="${ctaUrl}" style="display:inline-block;background:#2d6a4f;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Créer mon compte →
        </a>
      </div>
    </div>
    <div style="background:#f4f9f3;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">${schoolName} — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body></html>`,
    }).catch(() => {})
    return ok(undefined)
  } catch {
    return err('Erreur lors de l\'envoi de l\'email')
  }
}

export async function revokeRoleAction(
  memberId: string,
): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'permissions')) return err('Non autorisé')
  if (!memberId) return err('Identifiant membre manquant')
  try {
    void createNotificationInternal({
      schoolId: session.schoolId,
      recipientMemberId: memberId,
      type: 'role_revoked',
      title: 'Accès administrateur retiré',
      body: "Votre accès au portail d'administration a été révoqué.",
      link: undefined,
    })
    await permissionsService.revokeRole(memberId, session.schoolId)
    revalidatePath('/admin-portal/permissions')
    return ok(undefined)
  } catch (e) {
    return err('Erreur lors de la révocation du rôle')
  }
}
