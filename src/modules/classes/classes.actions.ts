'use server'

import { revalidatePath } from 'next/cache'
import { catalogClassesService } from './classes.service'
import { createCatalogClassSchema, updateCatalogClassSchema } from './classes.schema'
import { requireSession } from '@/lib/auth/session'
import { ok, err, unauthorized } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import type { CatalogClass, CatalogClassWithNext } from './classes.types'

const CATALOG_PATH = '/admin-portal/class-catalog'

export async function getCatalogClassesAction(): Promise<ActionResult<CatalogClassWithNext[]>> {
  await requireSession()
  try {
    const data = await catalogClassesService.getAll()
    return ok(data)
  } catch (e) {
    console.error('[getCatalogClassesAction]', e)
    return err('Impossible de charger le catalogue')
  }
}

export async function createCatalogClassAction(
  input: unknown
): Promise<ActionResult<CatalogClass>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = createCatalogClassSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const row = await catalogClassesService.create(parsed.data)
    revalidatePath(CATALOG_PATH)
    return ok(row)
  } catch (e: unknown) {
    console.error('[createCatalogClassAction]', e)
    const msg = (e as Error)?.message ?? ''
    if (msg.includes('unique')) return err('Ce code de classe existe déjà')
    return err('Impossible de créer la classe')
  }
}

export async function updateCatalogClassAction(
  id: string,
  input: unknown
): Promise<ActionResult<CatalogClass>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  const parsed = updateCatalogClassSchema.safeParse(input)
  if (!parsed.success) return err(parsed.error.issues[0].message)

  try {
    const row = await catalogClassesService.update(id, parsed.data)
    revalidatePath(CATALOG_PATH)
    return ok(row)
  } catch (e) {
    console.error('[updateCatalogClassAction]', e)
    return err('Impossible de modifier la classe')
  }
}

export async function deleteCatalogClassAction(
  id: string
): Promise<ActionResult<void>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    await catalogClassesService.delete(id)
    revalidatePath(CATALOG_PATH)
    return ok(undefined)
  } catch (e) {
    console.error('[deleteCatalogClassAction]', e)
    return err('Impossible de supprimer la classe')
  }
}
