import { db } from '@/db'
import { schools } from '@/db/schema'
import { asc } from 'drizzle-orm'
import { SignupForm } from './SignupForm'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ invite?: string; schoolId?: string; email?: string }>
}

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams
  const isAdminInvite = params.invite === 'admin'
  const prefilledSchoolId = params.schoolId ?? ''
  const prefilledEmail = params.email ? decodeURIComponent(params.email) : ''

  const schoolList = await db
    .select({ id: schools.id, name: schools.name })
    .from(schools)
    .orderBy(asc(schools.name))

  return (
    <div className="min-h-screen bg-[#fdf6f0] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#5c3820]">Qaf School</h1>
          <p className="text-muted-foreground mt-2">Application de gestion scolaire islamique</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-border p-8">
          <h2 className="text-xl font-semibold text-foreground mb-1">Créer un compte</h2>
          <p className="text-sm text-muted-foreground mb-6">Rejoignez Qaf School App</p>
          <SignupForm
            schools={schoolList}
            isAdminInvite={isAdminInvite}
            prefilledSchoolId={prefilledSchoolId}
            prefilledEmail={prefilledEmail}
          />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="text-[#c2440f] hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
