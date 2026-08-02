'use server'

import { requireSession } from '@/lib/auth/session'
import { canAccess } from '@/lib/auth/permissions'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'
import { paymentsService } from './payments.service'
import { createPaymentSchema, createParentPaymentSchema } from './payments.schema'
import type { CreatePaymentInput, CreateParentPaymentInput } from './payments.schema'
import type { PaymentListItem, PaymentKpis, ChildPaymentStatus } from './payments.types'

export async function getPaymentsAction(): Promise<ActionResult<PaymentListItem[]>> {
  const session = await requireSession()
  if (!canAccess(session, 'budget')) return err('Non autorisé')
  try {
    const data = await paymentsService.getAll(session.schoolId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement des paiements')
  }
}

export async function getPaymentKpisAction(): Promise<ActionResult<PaymentKpis>> {
  const session = await requireSession()
  if (!canAccess(session, 'budget')) return err('Non autorisé')
  try {
    const data = await paymentsService.getKpis(session.schoolId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement')
  }
}

export async function createPaymentAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'budget')) return err('Non autorisé')
  const parsed = createPaymentSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    await paymentsService.create(session.schoolId, session.memberId, parsed.data, 'admin')
    return ok(undefined)
  } catch {
    return err("Erreur lors de l'enregistrement du paiement")
  }
}

export async function updatePaymentAction(id: string, raw: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'budget')) return err('Non autorisé')
  const parsed = createPaymentSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    await paymentsService.update(session.schoolId, id, parsed.data)
    return ok(undefined)
  } catch {
    return err('Erreur lors de la modification')
  }
}

export async function deletePaymentAction(id: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'budget')) return err('Non autorisé')
  try {
    await paymentsService.delete(session.schoolId, id)
    return ok(undefined)
  } catch {
    return err('Erreur lors de la suppression')
  }
}

export async function verifyPaymentAction(id: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'budget')) return err('Non autorisé')
  try {
    await paymentsService.verify(session.schoolId, id)
    return ok(undefined)
  } catch {
    return err('Erreur lors de la vérification')
  }
}

export async function rejectPaymentAction(id: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'budget')) return err('Non autorisé')
  try {
    await paymentsService.reject(session.schoolId, id)
    return ok(undefined)
  } catch {
    return err('Erreur lors du rejet')
  }
}

export async function createParentPaymentAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('parent')) return err('Non autorisé')
  const parsed = createParentPaymentSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    const [profile] = await db
      .select({ fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.userId, session.userId))
      .limit(1)

    const input: CreatePaymentInput = {
      ...parsed.data,
      parentName: profile?.fullName ?? null,
      status: 'pending',
    }
    await paymentsService.create(session.schoolId, session.memberId, input, 'parent', profile?.fullName ?? null)
    return ok(undefined)
  } catch {
    return err("Erreur lors de l'envoi du paiement")
  }
}

export async function getChildrenPaymentStatusAction(): Promise<ActionResult<ChildPaymentStatus[]>> {
  const session = await requireSession()
  if (!session.roles.includes('parent')) return err('Non autorisé')
  try {
    const data = await paymentsService.getChildrenPaymentStatus(session.schoolId, session.memberId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement du statut de paiement')
  }
}

export async function remindUnpaidParentsAction(
  period: string,
): Promise<ActionResult<{ parentsNotified: number; studentsCount: number }>> {
  const session = await requireSession()
  if (!canAccess(session, 'budget')) return err('Non autorisé')
  try {
    const unpaid = await paymentsService.getUnpaidParents(session.schoolId, period)
    const studentsCount = unpaid.reduce((sum, u) => sum + u.studentNames.length, 0)

    const results = await Promise.allSettled(
      unpaid.map(u => sendEmail({
        to: u.email,
        subject: 'Qaf School — Rappel de paiement',
        html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf6f0;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#7a4f30,#c2440f);padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">Qaf School</h1>
      <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Rappel de paiement</p>
    </div>
    <div style="padding:40px;">
      <p style="color:#5c3820;font-size:16px;margin:0 0 16px;">Assalamo Alykom,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Le paiement de <strong>${u.studentNames.join(', ')}</strong> reste en attente pour la période sélectionnée. Merci de régulariser dès que possible.
      </p>
    </div>
    <div style="background:#fdf6f0;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Qaf School — Jazakum Allahu Khayran</p>
    </div>
  </div>
</body></html>`,
      }))
    )

    const parentsNotified = results.filter(r => r.status === 'fulfilled' && r.value).length
    return ok({ parentsNotified, studentsCount })
  } catch {
    return err("Erreur lors de l'envoi des rappels")
  }
}
