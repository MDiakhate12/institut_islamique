'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { teachersService } from './teachers.service'
import { inviteTeacherSchema, updateTeacherSchema } from './teachers.schema'
import { requireSession } from '@/lib/auth/session'
import { ok, err, unauthorized } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import type { Teacher, TeacherListItem } from './teachers.types'
import { ROUTES } from '@/lib/constants'
import { db } from '@/db'
import { schoolMembers } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function getTeachersAction(): Promise<ActionResult<TeacherListItem[]>> {
  const session = await requireSession()
  try {
    const data = await teachersService.getBySchool(session.schoolId)
    return ok(data)
  } catch (e) {
    console.error('[getTeachersAction]', e)
    return err('Impossible de charger les enseignants')
  }
}

export async function getTeacherAction(memberId: string): Promise<ActionResult<Teacher>> {
  const session = await requireSession()
  try {
    const teacher = await teachersService.getById(session.schoolId, memberId)
    if (!teacher) return err('Enseignant introuvable')
    return ok(teacher)
  } catch (e) {
    console.error('[getTeacherAction]', e)
    return err('Impossible de charger cet enseignant')
  }
}

export async function inviteTeacherAction(input: unknown): Promise<ActionResult<Teacher>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = inviteTeacherSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const teacher = await teachersService.invite(session.schoolId, parsed.data, session.userId)
    revalidatePath(ROUTES.admin.teachers)
    return ok(teacher)
  } catch (e: any) {
    console.error('[inviteTeacherAction]', e)
    // Gérer le cas où l'utilisateur existe déjà
    if (e?.message?.includes('already been registered')) {
      return err('Un compte existe déjà avec cet email')
    }
    return err("Impossible d'inviter cet enseignant. Réessayez.")
  }
}

export async function updateTeacherAction(
  memberId: string,
  input: unknown
): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = updateTeacherSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    await teachersService.update(session.schoolId, memberId, parsed.data)
    revalidatePath(ROUTES.admin.teachers)
    revalidatePath(`${ROUTES.admin.teachers}/${memberId}`)
    return ok(undefined)
  } catch (e) {
    console.error('[updateTeacherAction]', e)
    return err("Impossible de modifier l'enseignant.")
  }
}

export async function removeTeacherAction(memberId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    await teachersService.removeFromSchool(session.schoolId, memberId)
    revalidatePath(ROUTES.admin.teachers)
    return ok(undefined)
  } catch (e) {
    console.error('[removeTeacherAction]', e)
    return err("Impossible de retirer cet enseignant.")
  }
}

export async function activateTeacherAction(code: string): Promise<ActionResult<void>> {
  const session = await requireSession()

  if (!session.roles.includes('teacher')) return err('Non autorisé')
  if (!session.isPending) {
    redirect('/teacher-portal/homework')
  }

  if (code.trim().toLowerCase() !== session.memberId.toLowerCase()) {
    return err('Code invalide. Entrez le code complet (format : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).')
  }

  await db
    .update(schoolMembers)
    .set({ isPending: false, pendingEmail: null })
    .where(eq(schoolMembers.id, session.memberId))

  revalidatePath('/teacher-portal', 'layout')
  redirect('/teacher-portal/homework')
}
