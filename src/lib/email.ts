import nodemailer from 'nodemailer'
import { headers } from 'next/headers'
import { db } from '@/db'
import { and, arrayContains, eq, inArray, isNull, ne, or } from 'drizzle-orm'
import { schools, schoolMembers, parentStudents, classEnrollments } from '@/db/schema'
import { authUsers } from '@/db/auth-users'

export async function getAppUrl(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

/** Membres « réels » : compte créé (pas le sentinel NIL_UUID des invitations, §7.8). */
const hasAccount = ne(schoolMembers.userId, NIL_UUID)

const emails = (rows: { email: string | null }[]) => rows.map(r => r.email).filter((e): e is string => !!e)

/**
 * Admins à prévenir d'un événement pédagogique (inscription, notes d'examen) : sous-rôles
 * admin et gestionnaire. Les trésoriers sont exclus — ils n'ont accès ni aux Inscriptions ni
 * aux Examens (§7.17), le lien de l'e-mail les renverrait à l'accueil.
 */
const isAdminRecipient = and(
  arrayContains(schoolMembers.portalRoles, ['admin']),
  or(isNull(schoolMembers.adminSubRole), ne(schoolMembers.adminSubRole, 'treasurer')),
)

export async function getAdminEmails(schoolId: string): Promise<string[]> {
  const rows = await db
    .select({ email: authUsers.email })
    .from(schoolMembers)
    .innerJoin(authUsers, eq(authUsers.id, schoolMembers.userId))
    .where(and(eq(schoolMembers.schoolId, schoolId), isAdminRecipient, hasAccount))
  return emails(rows)
}

/** school_members.id des mêmes admins, pour les notifications in-app. */
export async function getAdminMemberIds(schoolId: string): Promise<string[]> {
  const rows = await db
    .select({ id: schoolMembers.id })
    .from(schoolMembers)
    .where(and(eq(schoolMembers.schoolId, schoolId), isAdminRecipient, hasAccount))
  return rows.map(r => r.id)
}

export async function getParentEmailsForClass(classId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ email: authUsers.email })
    .from(classEnrollments)
    .innerJoin(parentStudents, eq(parentStudents.studentId, classEnrollments.studentId))
    .innerJoin(schoolMembers, eq(schoolMembers.id, parentStudents.schoolMemberId))
    .innerJoin(authUsers, eq(authUsers.id, schoolMembers.userId))
    .where(and(
      eq(classEnrollments.classId, classId),
      isNull(classEnrollments.unenrolledAt),
      eq(schoolMembers.isPending, false),
      hasAccount,
    ))
  return emails(rows)
}

export async function getParentEmailsForStudent(studentId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ email: authUsers.email })
    .from(parentStudents)
    .innerJoin(schoolMembers, eq(schoolMembers.id, parentStudents.schoolMemberId))
    .innerJoin(authUsers, eq(authUsers.id, schoolMembers.userId))
    .where(and(eq(parentStudents.studentId, studentId), eq(schoolMembers.isPending, false), hasAccount))
  return emails(rows)
}

/** E-mails des membres actifs d'une école, filtrés par rôle de portail si `role` est fourni. */
export async function getMemberEmails(schoolId: string, role?: 'admin' | 'teacher' | 'parent'): Promise<string[]> {
  const rows = await db
    .select({ email: authUsers.email })
    .from(schoolMembers)
    .innerJoin(authUsers, eq(authUsers.id, schoolMembers.userId))
    .where(and(
      eq(schoolMembers.schoolId, schoolId),
      eq(schoolMembers.isPending, false),
      hasAccount,
      role ? arrayContains(schoolMembers.portalRoles, [role]) : undefined,
    ))
  return emails(rows)
}

/** E-mails de membres précis (school_members.id). */
export async function getEmailsForMembers(memberIds: string[]): Promise<string[]> {
  if (memberIds.length === 0) return []
  const rows = await db
    .selectDistinct({ email: authUsers.email })
    .from(schoolMembers)
    .innerJoin(authUsers, eq(authUsers.id, schoolMembers.userId))
    .where(and(inArray(schoolMembers.id, memberIds), hasAccount))
  return emails(rows)
}

export async function getSchoolName(schoolId: string): Promise<string> {
  try {
    const [row] = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, schoolId)).limit(1)
    return row?.name ?? 'Portail scolaire'
  } catch {
    return 'Portail scolaire'
  }
}

// Un seul transporteur réutilisé, en pool à 1 connexion : les envois passent l'un après l'autre
// sur la même session SMTP. Avant, chaque e-mail ouvrait sa propre connexion Gmail, toutes en
// parallèle — Gmail limite les connexions/authentifications simultanées d'un compte, et une
// partie des destinataires (ex. tous les admins sauf un) ne recevait rien, sans erreur visible.
function createPooledTransport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    pool: true,
    maxConnections: 1,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}
let transporter: ReturnType<typeof createPooledTransport> | null = null
function getTransporter() {
  if (!transporter) transporter = createPooledTransport()
  return transporter
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  fromName?: string
}): Promise<boolean> {
  const { fromName = 'Portail scolaire', ...mailOpts } = opts
  try {
    await getTransporter().sendMail({
      from: `${fromName} <${process.env.SMTP_USER}>`,
      ...mailOpts,
    })
    return true
  } catch (e) {
    console.warn('[sendEmail] SMTP error:', e)
    return false
  }
}

/**
 * Envoie le même e-mail à plusieurs destinataires, un par un, et journalise le bilan
 * (les échecs individuels étaient jusqu'ici noyés dans des console.warn isolés).
 */
export async function sendEmailToAll(
  recipients: string[],
  opts: { subject: string; html: string; fromName?: string },
  context: string,
): Promise<{ sent: number; failed: string[] }> {
  const failed: string[] = []
  let sent = 0
  for (const to of Array.from(new Set(recipients.map(r => r.trim().toLowerCase()).filter(Boolean)))) {
    if (await sendEmail({ to, ...opts })) sent++
    else failed.push(to)
  }
  if (failed.length > 0) {
    console.error(`[${context}] e-mail : ${sent} envoyé(s), ${failed.length} échec(s) → ${failed.join(', ')}`)
  }
  return { sent, failed }
}
