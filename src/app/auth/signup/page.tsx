import { db } from '@/db'
import { schools, schoolMembers } from '@/db/schema'
import { asc, and, eq } from 'drizzle-orm'
import { SignupForm } from './SignupForm'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ invite?: string; schoolId?: string; email?: string }>
}

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams
  const isAdminInvite = params.invite === 'admin'
  const isTeacherInvite = params.invite === 'teacher'
  const prefilledSchoolId = params.schoolId ?? ''
  const prefilledEmail = params.email ? decodeURIComponent(params.email) : ''

  const schoolList = await db
    .select({ id: schools.id, name: schools.name })
    .from(schools)
    .orderBy(asc(schools.name))

  // For teacher invites, fetch admin-registered name and phone from school_members
  let prefilledFullName = ''
  let prefilledPhone = ''
  if (isTeacherInvite && prefilledEmail && prefilledSchoolId) {
    const [member] = await db
      .select({ fullName: schoolMembers.fullName, phone: schoolMembers.phone })
      .from(schoolMembers)
      .where(and(
        eq(schoolMembers.schoolId, prefilledSchoolId),
        eq(schoolMembers.pendingEmail, prefilledEmail),
      ))
      .limit(1)
    prefilledFullName = member?.fullName ?? ''
    prefilledPhone = member?.phone ?? ''
  }

  return (
    <div className="min-h-screen bg-[#f4f9f3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1e4535]">Qaf School</h1>
          <p className="text-muted-foreground mt-2">Application de gestion scolaire islamique</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-border p-8">
          <h2 className="text-xl font-semibold text-foreground mb-1">Créer un compte</h2>
          <p className="text-sm text-muted-foreground mb-6">Rejoignez Qaf School App</p>
          <SignupForm
            schools={schoolList}
            isAdminInvite={isAdminInvite}
            isTeacherInvite={isTeacherInvite}
            prefilledSchoolId={prefilledSchoolId}
            prefilledEmail={prefilledEmail}
            prefilledFullName={prefilledFullName}
            prefilledPhone={prefilledPhone}
          />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="text-[#2d6a4f] hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
