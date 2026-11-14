import postgres from 'postgres'
import { createInviteToken, type InviteKind } from '../../src/lib/auth/invite-token'

/**
 * Lien d'invitation signé, tel que l'application l'enverrait par e-mail (aucun e-mail ne part en E2E).
 * Utilise le même secret que le serveur de test (`SUPABASE_SERVICE_ROLE_KEY` de `.env.test`).
 */
export async function inviteLink(kind: InviteKind, schoolSlug: string, email: string): Promise<string> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 })
  try {
    const [school] = await sql<{ id: string }[]>`select id from schools where slug = ${schoolSlug} limit 1`
    if (!school) throw new Error(`École ${schoolSlug} introuvable`)
    const token = createInviteToken({ kind, schoolId: school.id, email })
    return `/auth/signup?token=${encodeURIComponent(token)}`
  } finally {
    await sql.end()
  }
}
