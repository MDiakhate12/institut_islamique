'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { ADMIN_SUB_ROLES } from '@/lib/constants'
import type { AdminSubRole } from '@/lib/constants'
import { permissionsService } from './permissions.service'
import type { PermissionMember, SearchResult } from './permissions.types'
import { z } from 'zod'

export async function getPermissionsByRoleAction(
  role: AdminSubRole,
): Promise<ActionResult<PermissionMember[]>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return err('Non autorisé')
  try {
    const data = await permissionsService.getByRole(session.schoolId, role)
    return ok(data)
  } catch (e) {
    return err('Erreur lors du chargement des autorisations')
  }
}

const searchSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  targetRole: z.enum(['admin', 'treasurer', 'manager']),
})

export async function searchMemberByEmailAction(
  email: string,
  targetRole: AdminSubRole,
): Promise<ActionResult<SearchResult>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return err('Non autorisé')
  const parsed = searchSchema.safeParse({ email, targetRole })
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    const result = await permissionsService.searchByEmail(session.schoolId, email, targetRole)
    return ok(result)
  } catch (e) {
    return err('Erreur lors de la recherche')
  }
}

const grantSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'treasurer', 'manager']),
})

export async function grantRoleAction(
  email: string,
  role: AdminSubRole,
): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return err('Non autorisé')
  const parsed = grantSchema.safeParse({ email, role })
  if (!parsed.success) return err(parsed.error.issues[0].message)
  try {
    await permissionsService.grantRole(session.schoolId, email, role)
    revalidatePath('/admin-portal/permissions')
    return ok(undefined)
  } catch (e) {
    return err('Erreur lors de l\'attribution du rôle')
  }
}

export async function revokeRoleAction(
  memberId: string,
): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return err('Non autorisé')
  if (!memberId) return err('Identifiant membre manquant')
  try {
    await permissionsService.revokeRole(memberId, session.schoolId)
    revalidatePath('/admin-portal/permissions')
    return ok(undefined)
  } catch (e) {
    return err('Erreur lors de la révocation du rôle')
  }
}
