/**
 * Seed déterministe pour les tests E2E — Supabase LOCAL uniquement.
 * Idempotent : supprime puis recrée l'école E2E et ses comptes à chaque exécution.
 *
 * Usage : npm run e2e:seed   (inclus dans npm run e2e:db:reset)
 */
import { loadE2EEnv } from './support/env'
import { createClient } from '@supabase/supabase-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import {
  schools, profiles, schoolMembers, students, guardians, parentStudents, classes, classEnrollments,
  teacherAttendanceClasses, teacherHomeworkClasses,
} from '../src/db/schema'
import { DEFAULT_SETTINGS } from '../src/db/schema/schools'
import { E2E_SCHOOL, E2E_USERS, E2E_EMAIL_DOMAIN, type E2ERole } from './support/users'

const env = loadE2EEnv() // lève une erreur si la base n'est pas locale

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const client = postgres(env.DATABASE_URL!, { max: 1 })
const db = drizzle(client)

// Buckets utilisés par l'app (supabase.storage.from(...))
const BUCKETS = ['public', 'school-assets', 'expense-receipts', 'teacher-documents', 'homework-submissions']

async function seed() {
  // 1. Nettoyage — l'école en cascade, puis les comptes Auth du domaine de test
  await db.delete(schools).where(eq(schools.slug, E2E_SCHOOL.slug))
  const { data: existing, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError
  for (const u of existing.users.filter(u => u.email?.endsWith(`@${E2E_EMAIL_DOMAIN}`))) {
    await db.delete(profiles).where(eq(profiles.userId, u.id))
    await supabaseAdmin.auth.admin.deleteUser(u.id)
  }

  // 2. Buckets Storage
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  for (const name of BUCKETS) {
    if (!buckets?.some(b => b.name === name)) {
      const { error } = await supabaseAdmin.storage.createBucket(name, { public: true })
      if (error) throw error
    }
  }

  // 3. École
  const [school] = await db.insert(schools).values({
    name: E2E_SCHOOL.name,
    slug: E2E_SCHOOL.slug,
    settings: {
      ...DEFAULT_SETTINGS,
      onboardingCompleted: true,
      yearStartDate: '2025-09-01',
      yearEndDate: '2026-06-30',
      // Tous les jours : la chronologie de présence du parent n'affiche que les jours de classe,
      // le test présences doit donc trouver « aujourd'hui » quel que soit le jour du run
      schoolDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      rooms: ['Salle 1'],
      gradeLevels: ['CE2', 'CM1', 'CM2'],
    },
  }).returning()

  // 4. Comptes (Auth + profil + school_members)
  const memberIds = {} as Record<E2ERole, string>
  for (const [role, u] of Object.entries(E2E_USERS) as [E2ERole, (typeof E2E_USERS)[E2ERole]][]) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: env.E2E_PASSWORD!,
      email_confirm: true,
    })
    if (error) throw new Error(`createUser ${u.email} : ${error.message}`)

    await db.insert(profiles).values({ userId: data.user.id, fullName: u.fullName })
    const [member] = await db.insert(schoolMembers).values({
      schoolId: school.id,
      userId: data.user.id,
      portalRoles: [...u.portalRoles],
      adminSubRole: u.adminSubRole,
      teacherType: role === 'teacher' ? 'volunteer' : null,
      isPending: false,
      fullName: u.fullName,
    }).returning({ id: schoolMembers.id })
    memberIds[role] = member.id
  }

  // 5. Une classe, un élève inscrit, lié au parent
  const [klass] = await db.insert(classes).values({
    schoolId: school.id,
    teacherId: memberIds.teacher,
    subject: 'QRN',
    name: 'Classe Coran E2E',
    room: 'Salle 1',
    academicYear: DEFAULT_SETTINGS.academicYear,
  }).returning()

  const [student] = await db.insert(students).values({
    schoolId: school.id,
    firstName: 'Yassine',
    lastName: 'TESTEUR',
    gender: 'male',
    birthDate: '2015-04-12',
    createdBy: memberIds.admin,
  }).returning()

  await db.insert(guardians).values({
    schoolId: school.id,
    studentId: student.id,
    relationship: 'father',
    firstName: 'Parent',
    lastName: 'E2E',
    email: E2E_USERS.parent.email,
    isPrimary: true,
    linkedMemberId: memberIds.parent,
  })
  await db.insert(parentStudents).values({ schoolMemberId: memberIds.parent, studentId: student.id, schoolId: school.id })
  await db.insert(classEnrollments).values({ classId: klass.id, studentId: student.id, schoolId: school.id })

  // Classe déjà épinglée par l'enseignant (Présences + Devoirs) : l'épinglage via l'UI exclut
  // ensuite la classe des options, ce qui casserait le test au moindre retry
  const pin = { schoolId: school.id, schoolMemberId: memberIds.teacher, classId: klass.id }
  await db.insert(teacherAttendanceClasses).values(pin)
  await db.insert(teacherHomeworkClasses).values(pin)

  console.log(`✅ Seed E2E OK — école ${E2E_SCHOOL.slug} (${school.id}), ${Object.keys(memberIds).length} comptes`)
}

seed()
  .catch(e => { console.error('❌ Seed E2E échoué :', e); process.exitCode = 1 })
  .finally(() => client.end())
