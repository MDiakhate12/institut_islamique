/**
 * Script de seed — crée un compte admin + une école de test.
 * Usage : npx tsx src/db/seed.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schools, profiles, schoolMembers } from './schema'
import { DEFAULT_SETTINGS } from './schema/schools'
import { eq } from 'drizzle-orm'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

// ─── Config du compte à créer ───────────────────────────────────────────────
const SEED_EMAIL    = 'admin@qaf-test.fr'
const SEED_PASSWORD = 'Qaf2026!'
const SEED_NAME     = 'Admin Test'
const SCHOOL_NAME   = 'École Al-Nour'
const SCHOOL_SLUG   = 'al-nour'
// ────────────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Démarrage du seed...\n')

  // 1. Créer ou récupérer l'utilisateur Supabase Auth
  console.log(`📧 Création du compte : ${SEED_EMAIL}`)
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  let userId = existingUsers.users.find(u => u.email === SEED_EMAIL)?.id

  if (userId) {
    console.log(`   ↳ Compte existant trouvé (${userId}), mise à jour du mot de passe...`)
    await supabaseAdmin.auth.admin.updateUserById(userId, { password: SEED_PASSWORD })
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
      email_confirm: true,   // confirme l'email directement sans vérification
    })
    if (error) throw new Error(`Erreur Auth : ${error.message}`)
    userId = data.user.id
    console.log(`   ↳ Compte créé (${userId})`)
  }

  // 2. Créer ou récupérer l'école
  console.log(`\n🏫 Création de l'école : ${SCHOOL_NAME}`)
  let [school] = await db.select().from(schools).where(eq(schools.slug, SCHOOL_SLUG))

  if (school) {
    console.log(`   ↳ École existante trouvée (${school.id})`)
  } else {
    ;[school] = await db
      .insert(schools)
      .values({
        name: SCHOOL_NAME,
        slug: SCHOOL_SLUG,
        settings: {
          ...DEFAULT_SETTINGS,
          schoolDays: ['sunday', 'saturday'],
          academicYear: '2025-2026',
          currentTrimester: 1,
          allowNewRegistrations: true,
          examPeriodOpen: false,
          yearStartDate: '2025-09-01',
          yearEndDate: '2026-06-30',
        },
      })
      .returning()
    console.log(`   ↳ École créée (${school.id})`)
  }

  // 3. Créer ou mettre à jour le profil
  console.log(`\n👤 Création du profil : ${SEED_NAME}`)
  await db
    .insert(profiles)
    .values({ userId, fullName: SEED_NAME })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { fullName: SEED_NAME, updatedAt: new Date() },
    })
  console.log(`   ↳ Profil OK`)

  // 4. Créer le membership admin (si pas déjà présent)
  console.log(`\n🔑 Attribution du rôle admin...`)
  const [existingMember] = await db
    .select()
    .from(schoolMembers)
    .where(eq(schoolMembers.userId, userId))

  if (existingMember) {
    console.log(`   ↳ Membership existant trouvé`)
  } else {
    await db.insert(schoolMembers).values({
      schoolId: school.id,
      userId,
      portalRoles: ['admin'],
      adminSubRole: 'admin',
      isPending: false,
      createdBy: userId,
    })
    console.log(`   ↳ Membership admin créé`)
  }

  // ─── Résumé ───────────────────────────────────────────────────────────────
  console.log(`
╔═══════════════════════════════════════════╗
║           Seed terminé avec succès !      ║
╠═══════════════════════════════════════════╣
║  URL      http://localhost:3000           ║
║  Email    ${SEED_EMAIL.padEnd(31)}║
║  Mot de passe  ${SEED_PASSWORD.padEnd(26)}║
╚═══════════════════════════════════════════╝
`)

  await client.end()
}

seed().catch(err => {
  console.error('❌ Seed échoué :', err)
  process.exit(1)
})
