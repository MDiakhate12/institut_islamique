'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { ADMIN_SUB_ROLES } from '@/lib/constants'
import type { AdminSubRole } from '@/lib/constants'
import { permissionsService } from './permissions.service'
import type { PermissionMember, SearchResult } from './permissions.types'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'

export async function getPermissionsByRoleAction(
  role: AdminSubRole,
): Promise<ActionResult<PermissionMember[]>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return err('Non autorisé')
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
  if (!session.roles.includes('admin')) return err('Non autorisé')
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
  if (!session.roles.includes('admin')) return err('Non autorisé')
  const parsed = grantSchema.safeParse({ email, role })
  if (!parsed.success) return err(parsed.error.issues[0].message)
  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrateur',
    treasurer: 'Trésorier',
    manager: 'Gestionnaire',
  }
  try {
    await permissionsService.grantRole(session.schoolId, email, role)
    revalidatePath('/admin-portal/permissions')
    void sendEmail({
      to: email,
      subject: `Qaf School — Rôle ${ROLE_LABELS[role] ?? role} accordé`,
      html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf6f0;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7a4f30,#c2440f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">Qaf School</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Gestion des accès</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#5c3820;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Le rôle <strong>${ROLE_LABELS[role] ?? role}</strong> vous a été accordé sur <strong>Qaf School</strong>. Vous pouvez maintenant accéder au portail d'administration avec ce niveau d'accès.
      </p>
      <div style="text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin-portal" style="display:inline-block;background:#c2440f;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Accéder au portail →
        </a>
      </div>
    </div>
    <div style="background:#fdf6f0;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Qaf School — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body></html>`,
    }).catch(() => {})
    return ok(undefined)
  } catch (e) {
    return err('Erreur lors de l\'attribution du rôle')
  }
}

export async function revokeRoleAction(
  memberId: string,
): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return err('Non autorisé')
  if (!memberId) return err('Identifiant membre manquant')
  try {
    await permissionsService.revokeRole(memberId, session.schoolId)
    revalidatePath('/admin-portal/permissions')
    return ok(undefined)
  } catch (e) {
    return err('Erreur lors de la révocation du rôle')
  }
}
