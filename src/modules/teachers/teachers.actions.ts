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
import { sendEmail } from '@/lib/email'

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

  void sendEmail({
    to: session.email,
    subject: 'Votre compte Qaf School est activé',
    html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf6f0;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7a4f30,#c2440f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">Qaf School</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Portail Enseignant</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#5c3820;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Votre compte enseignant sur <strong>Qaf School</strong> est maintenant activé. Vous avez accès complet au portail enseignant : devoirs, présences, audio Coran et plus encore.
      </p>
      <div style="text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/teacher-portal/homework" style="display:inline-block;background:#c2440f;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
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

  revalidatePath('/teacher-portal', 'layout')
  redirect('/teacher-portal/homework')
}

// ── Bulk import from Excel ────────────────────────────────────────────────────

interface ImportTeacherRow {
  fullName: string
  email: string
  teacherType: string
  phone?: string
}

export async function importTeachersAction(
  rows: ImportTeacherRow[]
): Promise<ActionResult<{ created: number; errors: { row: number; message: string }[] }>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const errors: { row: number; message: string }[] = []
  let created = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    const fullName    = row.fullName?.trim()
    const email       = row.email?.trim().toLowerCase()
    const typeRaw     = row.teacherType?.trim().toLowerCase()

    if (!fullName) { errors.push({ row: rowNum, message: 'Nom complet manquant' }); continue }
    if (!email || !email.includes('@')) { errors.push({ row: rowNum, message: `Email invalide: "${row.email}"` }); continue }

    const teacherType: 'volunteer' | 'paid' | null =
      typeRaw.startsWith('bén') || typeRaw.startsWith('ben') || typeRaw === 'b' || typeRaw === 'volunteer'
        ? 'volunteer'
      : typeRaw.startsWith('pay') || typeRaw === 'p' || typeRaw === 'paid'
        ? 'paid'
      : null

    if (!teacherType) {
      errors.push({ row: rowNum, message: `Type invalide: "${row.teacherType}". Utilisez Bénévole ou Payé` })
      continue
    }

    try {
      await teachersService.invite(
        session.schoolId,
        { fullName, email, teacherType, phone: row.phone || undefined },
        session.userId,
      )
      created++
    } catch (e) {
      const allText = [
        e instanceof Error ? e.message : '',
        e instanceof Error && e.cause instanceof Error ? e.cause.message : '',
      ].join(' ')
      if (allText.includes('unique') || allText.includes('23505')) {
        errors.push({ row: rowNum, message: `Un compte existe déjà pour ${email}` })
      } else {
        errors.push({ row: rowNum, message: e instanceof Error ? e.message : 'Erreur inconnue' })
      }
    }
  }

  revalidatePath(ROUTES.admin.teachers)
  return ok({ created, errors })
}
