import nodemailer from 'nodemailer'
import { headers } from 'next/headers'
import { db } from '@/db'
import { and, arrayContains, eq, isNull, ne } from 'drizzle-orm'
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

export async function getAdminEmails(schoolId: string): Promise<string[]> {
  const rows = await db
    .select({ email: authUsers.email })
    .from(schoolMembers)
    .innerJoin(authUsers, eq(authUsers.id, schoolMembers.userId))
    .where(and(
      eq(schoolMembers.schoolId, schoolId),
      arrayContains(schoolMembers.portalRoles, ['admin']),
      hasAccount,
    ))
  return emails(rows)
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

export async function getSchoolName(schoolId: string): Promise<string> {
  try {
    const [row] = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, schoolId)).limit(1)
    return row?.name ?? 'Portail scolaire'
  } catch {
    return 'Portail scolaire'
  }
}

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  fromName?: string
}): Promise<boolean> {
  const { fromName = 'Portail scolaire', ...mailOpts } = opts
  try {
    await createTransporter().sendMail({
      from: `${fromName} <${process.env.SMTP_USER}>`,
      ...mailOpts,
    })
    return true
  } catch (e) {
    console.warn('[sendEmail] SMTP error:', e)
    return false
  }
}
