import nodemailer from 'nodemailer'
import { db } from '@/db'
import { sql } from 'drizzle-orm'

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

export async function getAdminEmails(schoolId: string): Promise<string[]> {
  const rows = await db.execute(sql`
    SELECT COALESCE(au.email, sm.pending_email) AS email
    FROM school_members sm
    LEFT JOIN auth.users au ON au.id = sm.user_id
    WHERE sm.school_id = ${schoolId}
      AND 'admin' = ANY(sm.portal_roles)
      AND sm.user_id != ${NIL_UUID}::uuid
  `)
  return (rows as unknown as { email: string | null }[]).map(r => r.email).filter(Boolean) as string[]
}

export async function getParentEmailsForClass(classId: string): Promise<string[]> {
  const rows = await db.execute(sql`
    SELECT DISTINCT au.email
    FROM class_enrollments ce
    JOIN parent_students ps ON ps.student_id = ce.student_id
    JOIN school_members sm ON sm.id = ps.parent_member_id
    JOIN auth.users au ON au.id = sm.user_id
    WHERE ce.class_id = ${classId}
      AND sm.is_pending = false
      AND sm.user_id != ${NIL_UUID}::uuid
  `)
  return (rows as unknown as { email: string }[]).map(r => r.email).filter(Boolean)
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
}): Promise<boolean> {
  try {
    await createTransporter().sendMail({
      from: `Qaf School <${process.env.SMTP_USER}>`,
      ...opts,
    })
    return true
  } catch (e) {
    console.warn('[sendEmail] SMTP error:', e)
    return false
  }
}
