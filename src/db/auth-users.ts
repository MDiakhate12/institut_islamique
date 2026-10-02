import { pgSchema, uuid, text } from 'drizzle-orm/pg-core'
import { eq } from 'drizzle-orm'
import { db } from '@/db'

/**
 * Table `auth.users` gérée par Supabase Auth — déclarée ici en lecture seule pour que les
 * requêtes qui la joignent soient typées (colonnes vérifiées à la compilation).
 * VOLONTAIREMENT hors de `src/db/schema/` : drizzle-kit (drizzle.config.ts → schema/index.ts)
 * ne doit jamais tenter de créer, modifier ou migrer le schéma `auth`.
 */
export const authUsers = pgSchema('auth').table('users', {
  id:    uuid('id').primaryKey(),
  email: text('email'),
})

export async function getAuthUserIdByEmail(email: string): Promise<string | null> {
  const [row] = await db.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.email, email)).limit(1)
  return row?.id ?? null
}

export async function getAuthEmailByUserId(userId: string): Promise<string | null> {
  const [row] = await db.select({ email: authUsers.email }).from(authUsers).where(eq(authUsers.id, userId)).limit(1)
  return row?.email ?? null
}
