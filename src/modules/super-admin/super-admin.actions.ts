'use server'

import { headers } from 'next/headers'
import { sendEmail } from '@/lib/email'
import { superAdminService } from './super-admin.service'
import { createSchoolSchema, updateSchoolBasicSchema } from './super-admin.schema'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'

async function getAppUrl(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}


function buildInviteEmail(opts: { schoolName: string; inviteUrl: string }): string {
  return `
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
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Vous avez été invité(e) en tant qu'<strong>administrateur</strong> de l'école
        <strong>${opts.schoolName}</strong> sur Qaf School.
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 32px;">
        Cliquez sur le bouton ci-dessous pour créer votre compte et accéder à votre portail d'administration.
      </p>
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${opts.inviteUrl}" style="display:inline-block;background:#c2440f;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Activer mon compte →
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="${opts.inviteUrl}" style="color:#c2440f;word-break:break-all;">${opts.inviteUrl}</a>
      </p>
    </div>
    <div style="background:#fdf6f0;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Qaf School — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body>
</html>`
}

async function sendInviteEmail(to: string, schoolName: string, inviteUrl: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Invitation : Administrateur de ${schoolName}`,
    html: buildInviteEmail({ schoolName, inviteUrl }),
  })
}

export async function createSchoolAction(raw: unknown): Promise<ActionResult<{
  schoolId: string
  schoolName: string
  inviteUrl: string
  emailSent: boolean
}>> {
  const parsed = createSchoolSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  const { data } = parsed

  try {
    const { school } = await superAdminService.createSchoolWithAdmin(data)

    const appUrl = await getAppUrl()
    const inviteUrl = `${appUrl}/auth/signup?invite=admin&schoolId=${school.id}&email=${encodeURIComponent(data.adminEmail)}`

    const emailSent = await sendInviteEmail(data.adminEmail, data.schoolName, inviteUrl)

    return ok({ schoolId: school.id, schoolName: school.name, inviteUrl, emailSent })
  } catch (e: unknown) {
    const allText = [
      e instanceof Error ? e.message : '',
      e instanceof Error && e.cause instanceof Error ? e.cause.message : '',
      JSON.stringify((e as Record<string, unknown>)?.cause ?? ''),
    ].join(' ')
    if (allText.includes('unique') || allText.includes('duplicate') || allText.includes('23505')) {
      return err('Ce slug est déjà utilisé. Choisissez un slug différent.')
    }
    console.error('[createSchoolAction]', e)
    return err("Erreur lors de la création de l'école")
  }
}

export async function getAllSchoolsAction(): Promise<ActionResult<Awaited<ReturnType<typeof superAdminService.getAllSchools>>>> {
  try {
    const data = await superAdminService.getAllSchools()
    return ok(data)
  } catch {
    return err('Erreur lors du chargement des écoles')
  }
}

export async function resendInviteAction(schoolId: string): Promise<ActionResult<{ emailSent: boolean; inviteUrl: string }>> {
  try {
    const [pendingEmail, schoolName] = await Promise.all([
      superAdminService.getPendingAdminEmail(schoolId),
      superAdminService.getSchoolName(schoolId),
    ])

    if (!pendingEmail) return err('Aucun administrateur en attente pour cette école.')

    const appUrl = await getAppUrl()
    const inviteUrl = `${appUrl}/auth/signup?invite=admin&schoolId=${schoolId}&email=${encodeURIComponent(pendingEmail)}`

    const emailSent = await sendInviteEmail(pendingEmail, schoolName ?? '', inviteUrl)

    return ok({ emailSent, inviteUrl })
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Erreur inconnue')
  }
}

export async function deleteSchoolAction(schoolId: string): Promise<ActionResult<void>> {
  try {
    await superAdminService.deleteSchool(schoolId)
    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Erreur lors de la suppression')
  }
}

export async function updateSchoolAction(
  schoolId: string,
  raw: unknown,
): Promise<ActionResult<void>> {
  const parsed = updateSchoolBasicSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    await superAdminService.updateSchoolBasic(schoolId, parsed.data)
    return ok(undefined)
  } catch (e: unknown) {
    const allText = [
      e instanceof Error ? e.message : '',
      e instanceof Error && e.cause instanceof Error ? e.cause.message : '',
      JSON.stringify((e as Record<string, unknown>)?.cause ?? ''),
    ].join(' ')
    if (allText.includes('unique') || allText.includes('duplicate') || allText.includes('23505')) {
      return err('Ce slug est déjà utilisé.')
    }
    console.error('[updateSchoolAction]', e)
    return err("Erreur lors de la mise à jour de l'école")
  }
}
