'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { ok, err, unauthorized } from '@/lib/result'
import { schoolService } from './school.service'
import { updateSchoolInfoSchema, updateSchoolSettingsSchema } from './school.schema'
import type { ActionResult } from '@/lib/result'
import type { School } from './school.types'
import type { UpdateSchoolSettingsInput } from './school.schema'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

// READ
export async function getSchoolAction(): Promise<ActionResult<School>> {
  const session = await requireSession()
  try {
    const school = await schoolService.getById(session.schoolId)
    if (!school) return err('École introuvable')
    return ok(school)
  } catch (e) {
    console.error('[getSchoolAction]', e)
    return err('Impossible de charger les paramètres')
  }
}

// UPDATE identity + contact fields
export async function updateSchoolInfoAction(input: unknown): Promise<ActionResult<School>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = updateSchoolInfoSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const updated = await schoolService.updateInfo(session.schoolId, parsed.data)
    revalidatePath('/admin-portal/school-settings')
    return ok(updated)
  } catch (e) {
    console.error('[updateSchoolInfoAction]', e)
    return err("Impossible de mettre à jour l'école")
  }
}

// UPDATE settings (JSONB patch)
export async function updateSchoolSettingsAction(input: UpdateSchoolSettingsInput): Promise<ActionResult<School>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = updateSchoolSettingsSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const updated = await schoolService.updateSettings(session.schoolId, parsed.data)
    revalidatePath('/admin-portal/school-settings')
    return ok(updated)
  } catch (e) {
    console.error('[updateSchoolSettingsAction]', e)
    return err('Impossible de mettre à jour les paramètres')
  }
}

// UPLOAD LOGO — receives base64 data URL, stores in Supabase Storage
export async function uploadSchoolLogoAction(
  base64DataUrl: string,
  fileName: string,
): Promise<ActionResult<string>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    // Convert data URL to Buffer
    const base64 = base64DataUrl.split(',')[1]
    const buffer = Buffer.from(base64, 'base64')
    const mimeType = base64DataUrl.split(';')[0].split(':')[1]

    const path = `schools/${session.schoolId}/logo/${fileName}`

    const { error } = await supabaseAdmin.storage
      .from('school-assets')
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (error) return err(error.message)

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('school-assets')
      .getPublicUrl(path)

    await schoolService.updateLogoUrl(session.schoolId, publicUrl)
    revalidatePath('/admin-portal/school-settings')
    return ok(publicUrl)
  } catch (e) {
    console.error('[uploadSchoolLogoAction]', e)
    return err('Impossible de téléverser le logo')
  }
}

export async function sendSupportEmailAction(input: {
  name: string
  email: string
  subject: string
  message: string
}): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;padding:32px;background:#f9fafb;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="color:#c2440f;margin:0 0 20px;">Support Qaf School</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;width:100px;">Nom</td><td style="padding:6px 0;font-weight:600;">${input.name}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;">${input.email}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">École</td><td style="padding:6px 0;">${session.schoolId}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Sujet</td><td style="padding:6px 0;font-weight:600;">${input.subject}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
    <p style="font-size:15px;line-height:1.7;color:#374151;white-space:pre-wrap;">${input.message}</p>
  </div>
</body>
</html>`

    await sendEmail({
      to: process.env.SMTP_USER ?? '',
      subject: `[Support Qaf] ${input.subject}`,
      html,
    })
    return ok(undefined)
  } catch (e) {
    console.error('[sendSupportEmailAction]', e)
    return err("Impossible d'envoyer le message")
  }
}
