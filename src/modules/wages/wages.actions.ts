'use server'

import { requireSession } from '@/lib/auth/session'
import { canAccess } from '@/lib/auth/permissions'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { wagesService } from './wages.service'
import { logHoursSchema, logMyHoursSchema, updateWageStatusSchema } from './wages.schema'
import type { WageTimesheet, WageKpis, TeacherOption, TeacherClassOption } from './wages.types'

export async function getWageTimesheetAction(): Promise<ActionResult<WageTimesheet>> {
  const session = await requireSession()
  if (!canAccess(session, 'expenses')) return err('Non autorisé')
  try {
    const data = await wagesService.getTimesheet(session.schoolId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement des salaires')
  }
}

export async function getWageKpisAction(): Promise<ActionResult<WageKpis>> {
  const session = await requireSession()
  if (!canAccess(session, 'expenses')) return err('Non autorisé')
  try {
    const data = await wagesService.getKpis(session.schoolId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement')
  }
}

export async function getMyWagesAction(): Promise<ActionResult<WageTimesheet>> {
  const session = await requireSession()
  if (!session.roles.includes('teacher')) return err('Non autorisé')
  try {
    const data = await wagesService.getForTeacher(session.schoolId, session.memberId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement de vos heures')
  }
}

export async function getMyWageKpisAction(): Promise<ActionResult<WageKpis>> {
  const session = await requireSession()
  if (!session.roles.includes('teacher')) return err('Non autorisé')
  try {
    const data = await wagesService.getKpis(session.schoolId, session.memberId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement')
  }
}

export async function getTeacherOptionsAction(): Promise<ActionResult<TeacherOption[]>> {
  const session = await requireSession()
  if (!canAccess(session, 'expenses')) return err('Non autorisé')
  try {
    const data = await wagesService.getTeacherOptions(session.schoolId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement des enseignants')
  }
}

export async function getTeacherClassOptionsAction(teacherId: string): Promise<ActionResult<TeacherClassOption[]>> {
  const session = await requireSession()
  try {
    const data = await wagesService.getTeacherClassOptions(session.schoolId, teacherId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement des classes')
  }
}

export async function getMyClassOptionsAction(): Promise<ActionResult<TeacherClassOption[]>> {
  const session = await requireSession()
  if (!session.roles.includes('teacher')) return err('Non autorisé')
  try {
    const data = await wagesService.getTeacherClassOptions(session.schoolId, session.memberId)
    return ok(data)
  } catch {
    return err('Erreur lors du chargement des classes')
  }
}

export async function logHoursAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'expenses')) return err('Non autorisé')
  const parsed = logHoursSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    await wagesService.logHours(session.schoolId, session.memberId, parsed.data.teacherId, parsed.data)
    return ok(undefined)
  } catch {
    return err("Erreur lors de l'enregistrement des heures")
  }
}

export async function logMyHoursAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('teacher')) return err('Non autorisé')
  const parsed = logMyHoursSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    await wagesService.logHours(session.schoolId, session.memberId, session.memberId, parsed.data)
    return ok(undefined)
  } catch {
    return err("Erreur lors de l'enregistrement des heures")
  }
}

export async function updateWageStatusAction(raw: unknown): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!canAccess(session, 'expenses')) return err('Non autorisé')
  const parsed = updateWageStatusSchema.safeParse(raw)
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    await wagesService.updateStatus(session.schoolId, parsed.data.id, parsed.data.status, parsed.data.hourlyRateCents)
    return ok(undefined)
  } catch {
    return err('Erreur lors de la mise à jour')
  }
}
