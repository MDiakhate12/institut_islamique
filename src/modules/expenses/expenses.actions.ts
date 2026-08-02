'use server'

import { requireSession } from '@/lib/auth/session'
import { canAccess } from '@/lib/auth/permissions'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { createClient } from '@/lib/supabase/server'
import { expensesService } from './expenses.service'
import { createExpenseSchema, updateExpenseStatusSchema } from './expenses.schema'
import type { ExpenseListItem, ExpenseKpis } from './expenses.types'

export async function getExpensesAction(): Promise<ActionResult<ExpenseListItem[]>> {
  const session = await requireSession()
  if (!canAccess(session, 'expenses')) return err('Non autorisé')
  try {
    const data = await expensesService.getAll(session.schoolId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement des dépenses')
  }
}

export async function getExpenseKpisAction(): Promise<ActionResult<ExpenseKpis>> {
  const session = await requireSession()
  if (!canAccess(session, 'expenses')) return err('Non autorisé')
  try {
    const data = await expensesService.getKpis(session.schoolId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement')
  }
}

export async function getMyExpensesAction(): Promise<ActionResult<ExpenseListItem[]>> {
  const session = await requireSession()
  try {
    const data = await expensesService.getBySubmitter(session.schoolId, session.memberId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement de vos remboursements')
  }
}

export async function getMyExpenseKpisAction(): Promise<ActionResult<ExpenseKpis>> {
  const session = await requireSession()
  try {
    const data = await expensesService.getKpis(session.schoolId, session.memberId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement')
  }
}

export async function createExpenseAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  const parsed = createExpenseSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    let receiptUrl: string | null = null
    if (parsed.data.receipt) {
      const supabase = await createClient()
      const bytes = Buffer.from(parsed.data.receipt.base64, 'base64')
      const ext = parsed.data.receipt.mimeType.includes('pdf') ? 'pdf'
        : parsed.data.receipt.mimeType.includes('png') ? 'png' : 'jpg'
      const filePath = `${session.schoolId}/${session.memberId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(filePath, bytes, { contentType: parsed.data.receipt.mimeType, upsert: true })

      if (uploadError) return err('Impossible de téléverser le reçu')

      const { data: { publicUrl } } = supabase.storage.from('expense-receipts').getPublicUrl(filePath)
      receiptUrl = publicUrl
    }

    await expensesService.create(session.schoolId, session.memberId, parsed.data, receiptUrl)
    return ok(undefined)
  } catch {
    return err("Erreur lors de la soumission de la dépense")
  }
}

export async function approveExpenseAction(id: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'expenses')) return err('Non autorisé')
  try {
    await expensesService.updateStatus(session.schoolId, id, 'approved', session.memberId)
    return ok(undefined)
  } catch {
    return err("Erreur lors de l'approbation")
  }
}

export async function rejectExpenseAction(id: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'expenses')) return err('Non autorisé')
  try {
    await expensesService.updateStatus(session.schoolId, id, 'rejected')
    return ok(undefined)
  } catch {
    return err('Erreur lors du rejet')
  }
}

export async function markExpensePaidAction(id: string): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'expenses')) return err('Non autorisé')
  try {
    await expensesService.updateStatus(session.schoolId, id, 'paid')
    return ok(undefined)
  } catch {
    return err('Erreur lors du marquage comme payé')
  }
}
