'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { homeworkService } from './homework.service'
import { createHomeworkSchema, updateHomeworkSchema } from './homework.schema'
import type { HomeworkItem, PinnedClass, ClassOption, VirtualSession, HomeworkStudent, ParentChild, ParentHomeworkItem, AdminHomeworkOverview } from './homework.types'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, getParentEmailsForClass } from '@/lib/email'

const path = '/teacher-portal/homework'

export async function getPinnedClassesAction(): Promise<ActionResult<PinnedClass[]>> {
  const session = await requireSession()
  try {
    const data = await homeworkService.getPinnedClasses(session.schoolId, session.memberId)
    return ok(data)
  } catch (e) {
    console.error('[getPinnedClassesAction]', e)
    return err('Impossible de charger les classes')
  }
}

export async function getClassOptionsAction(): Promise<ActionResult<ClassOption[]>> {
  const session = await requireSession()
  try {
    const pinned = await homeworkService.getPinnedClasses(session.schoolId, session.memberId)
    const excludeIds = pinned.map(p => p.classId)
    const data = await homeworkService.getClassOptions(session.schoolId, session.memberId, excludeIds)
    return ok(data)
  } catch (e) {
    console.error('[getClassOptionsAction]', e)
    return err('Impossible de charger les classes disponibles')
  }
}

export async function addPinnedClassAction(classId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await homeworkService.addPinnedClass(session.schoolId, session.memberId, classId)
    revalidatePath(path)
    return ok(undefined)
  } catch (e) {
    console.error('[addPinnedClassAction]', e)
    return err("Impossible d'ajouter la classe")
  }
}

export async function removePinnedClassAction(pinnedId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await homeworkService.removePinnedClass(pinnedId)
    revalidatePath(path)
    return ok(undefined)
  } catch (e) {
    console.error('[removePinnedClassAction]', e)
    return err('Impossible de retirer la classe')
  }
}

export async function getHomeworkByClassAction(classId: string): Promise<ActionResult<HomeworkItem[]>> {
  const session = await requireSession()
  try {
    const data = await homeworkService.getByClass(session.schoolId, classId)
    return ok(data)
  } catch (e) {
    console.error('[getHomeworkByClassAction]', e)
    return err('Impossible de charger les devoirs')
  }
}

export async function createHomeworkAction(input: unknown): Promise<ActionResult<HomeworkItem>> {
  const session = await requireSession()
  const parsed = createHomeworkSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    const item = await homeworkService.create(session.schoolId, session.memberId, parsed.data)
    revalidatePath(path)

    const surahLabel = item.surahName ? `${item.surahName}${item.surahArabic ? ` — ${item.surahArabic}` : ''}` : null
    const description = item.description || surahLabel || 'Nouveau devoir'
    getParentEmailsForClass(parsed.data.classId).then(emails =>
      Promise.allSettled(emails.map(to => sendEmail({
        to,
        subject: 'Nouveau devoir — Qaf School',
        html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf6f0;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7a4f30,#c2440f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">Qaf School</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Nouveau devoir assigné</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#5c3820;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Un nouveau devoir a été assigné à votre enfant :
      </p>
      <div style="background:#fdf6f0;border-left:4px solid #c2440f;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0;font-size:15px;font-weight:bold;color:#1f2937;">${description}</p>
      </div>
      <div style="text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/parent-portal/homework" style="display:inline-block;background:#c2440f;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Voir les devoirs →
        </a>
      </div>
    </div>
    <div style="background:#fdf6f0;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Qaf School — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body></html>`,
      })))
    ).catch(() => {})

    return ok(item)
  } catch (e) {
    console.error('[createHomeworkAction]', e)
    return err('Impossible de créer le devoir')
  }
}

export async function updateHomeworkAction(
  homeworkId: string,
  input: unknown,
): Promise<ActionResult<void>> {
  const session = await requireSession()
  const parsed = updateHomeworkSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    await homeworkService.update(homeworkId, session.schoolId, parsed.data)
    revalidatePath(path)
    return ok(undefined)
  } catch (e) {
    console.error('[updateHomeworkAction]', e)
    return err('Impossible de modifier le devoir')
  }
}

export async function deleteHomeworkAction(homeworkId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await homeworkService.delete(homeworkId, session.schoolId)
    revalidatePath(path)
    return ok(undefined)
  } catch (e) {
    console.error('[deleteHomeworkAction]', e)
    return err('Impossible de supprimer le devoir')
  }
}

export async function getHomeworkStudentsAction(classId: string): Promise<ActionResult<HomeworkStudent[]>> {
  const session = await requireSession()
  try {
    const data = await homeworkService.getStudentsByClass(session.schoolId, classId)
    return ok(data)
  } catch (e) {
    console.error('[getHomeworkStudentsAction]', e)
    return err('Impossible de charger les élèves')
  }
}

export async function getActiveSessionAction(classId: string): Promise<ActionResult<VirtualSession | null>> {
  const session = await requireSession()
  try {
    const data = await homeworkService.getActiveSession(session.schoolId, classId)
    return ok(data)
  } catch (e) {
    console.error('[getActiveSessionAction]', e)
    return err('Impossible de charger la session')
  }
}

export async function createVirtualSessionAction(classId: string): Promise<ActionResult<VirtualSession>> {
  const session = await requireSession()
  try {
    const data = await homeworkService.createVirtualSession(session.schoolId, classId, session.memberId)
    revalidatePath(path)
    return ok(data)
  } catch (e) {
    console.error('[createVirtualSessionAction]', e)
    return err('Impossible de créer la session virtuelle')
  }
}

export async function endVirtualSessionAction(sessionId: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  try {
    await homeworkService.endVirtualSession(sessionId, session.schoolId)
    revalidatePath(path)
    return ok(undefined)
  } catch (e) {
    console.error('[endVirtualSessionAction]', e)
    return err('Impossible de terminer la session')
  }
}

export async function getParentHomeworkAction(): Promise<ActionResult<{ children: ParentChild[]; homeworkItems: ParentHomeworkItem[] }>> {
  const session = await requireSession()
  try {
    const data = await homeworkService.getForParent(session.schoolId, session.memberId)
    return ok(data)
  } catch (e) {
    console.error('[getParentHomeworkAction]', e)
    return err('Impossible de charger les devoirs')
  }
}

export async function submitHomeworkRecordingAction(
  homeworkId: string,
  studentId: string,
  recordingBlob: { base64: string; mimeType: string; durationSeconds: number | null },
): Promise<ActionResult<string>> {
  const session = await requireSession()
  try {
    const supabase = await createClient()
    const bytes = Buffer.from(recordingBlob.base64, 'base64')
    const ext = recordingBlob.mimeType.includes('webm') ? 'webm' : 'mp4'
    const filePath = `${session.schoolId}/${homeworkId}/${studentId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('homework-submissions')
      .upload(filePath, bytes, { contentType: recordingBlob.mimeType, upsert: true })

    if (uploadError) return err('Impossible de téléverser l\'enregistrement')

    const { data: { publicUrl } } = supabase.storage
      .from('homework-submissions')
      .getPublicUrl(filePath)

    await homeworkService.submitRecording(
      session.schoolId,
      homeworkId,
      studentId,
      publicUrl,
      recordingBlob.durationSeconds,
    )

    revalidatePath('/parent-portal/homework')
    return ok(publicUrl)
  } catch (e) {
    console.error('[submitHomeworkRecordingAction]', e)
    return err('Impossible de soumettre le devoir')
  }
}

export async function getAdminHomeworkOverviewAction(
  date: string,
): Promise<ActionResult<AdminHomeworkOverview>> {
  const session = await requireSession()
  try {
    const data = await homeworkService.getAdminOverview(session.schoolId, date)
    return ok(data)
  } catch (e) {
    console.error('[getAdminHomeworkOverviewAction]', e)
    return err('Erreur lors du chargement')
  }
}
