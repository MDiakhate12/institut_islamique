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
