'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { db } from '@/db'
import { profiles, schoolMembers } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { profileService } from './profile.service'
import {
  updateProfileSchema, updateLanguageSchema, changeEmailSchema,
  changePasswordSchema, deleteAccountSchema,
} from './profile.schema'
import type { ProfileData } from './profile.types'

const PROFILE_PATHS = ['/admin-portal/profile', '/parent-portal/profile', '/teacher-portal/profile']

function revalidateProfile() {
  for (const path of PROFILE_PATHS) revalidatePath(path)
}

export async function getProfileAction(): Promise<ActionResult<ProfileData>> {
  const session = await requireSession()
  try {
    const profile = await profileService.getProfile(session.userId, session.schoolId)
    if (!profile) return err('Profil introuvable')
    return ok({ ...profile, email: session.email })
  } catch (e) {
    console.error('[getProfileAction]', e)
    return err('Impossible de charger le profil')
  }
}

export async function updateProfileAction(input: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    await profileService.updateProfile(session.userId, session.memberId, parsed.data)
    revalidateProfile()
    return ok(undefined)
  } catch (e) {
    console.error('[updateProfileAction]', e)
    return err(e instanceof Error ? e.message : 'Impossible de mettre à jour le profil')
  }
}

export async function updateLanguageAction(input: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  const parsed = updateLanguageSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    await profileService.updateLanguage(session.userId, parsed.data.preferredLanguage)
    revalidateProfile()
    return ok(undefined)
  } catch (e) {
    console.error('[updateLanguageAction]', e)
    return err('Impossible de mettre à jour la langue')
  }
}

export async function changeEmailAction(input: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  const parsed = changeEmailSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const supabase = await createClient()
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: session.email,
      password: parsed.data.currentPassword,
    })
    if (reauthError) return err('Mot de passe actuel incorrect')

    const { error } = await supabase.auth.updateUser({ email: parsed.data.newEmail })
    if (error) return err(error.message)

    return ok(undefined)
  } catch (e) {
    console.error('[changeEmailAction]', e)
    return err("Impossible de mettre à jour l'e-mail")
  }
}

export async function changePasswordAction(input: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const supabase = await createClient()
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: session.email,
      password: parsed.data.currentPassword,
    })
    if (reauthError) return err('Mot de passe actuel incorrect')

    const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword })
    if (error) return err(error.message)

    return ok(undefined)
  } catch (e) {
    console.error('[changePasswordAction]', e)
    return err('Impossible de mettre à jour le mot de passe')
  }
}

export async function deleteAccountAction(input: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  const parsed = deleteAccountSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const supabase = await createClient()
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: session.email,
      password: parsed.data.currentPassword,
    })
    if (reauthError) return err('Mot de passe actuel incorrect')

    await db.delete(schoolMembers).where(eq(schoolMembers.userId, session.userId))
    await db.delete(profiles).where(eq(profiles.userId, session.userId))

    const { error } = await supabaseAdmin.auth.admin.deleteUser(session.userId)
    if (error) return err(error.message)
  } catch (e) {
    console.error('[deleteAccountAction]', e)
    return err('Impossible de supprimer le compte')
  }

  redirect('/auth/login')
}
