import { db } from '@/db'
import { verifyInviteToken } from '@/lib/auth/invite-token'
import { formatPhone } from '@/lib/phone'
import { schools, schoolMembers } from '@/db/schema'
import { asc, and, eq, isNull } from 'drizzle-orm'
import { SignupForm } from './SignupForm'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ token?: string; invite?: string; schoolId?: string; email?: string; school?: string }>
}

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams

  // Invitation signée (admin / enseignant) : le jeton fournit rôle, école et e-mail
  const invite = verifyInviteToken(params.token)
  // Un lien admin sans jeton valide (ancien format `?invite=admin`) n'ouvre plus rien : le rôle admin
  // ne s'obtient que par invitation signée.
  const invalidInvite = (!!params.token && !invite) || (!params.token && params.invite === 'admin')

  const isAdminInvite = invite?.kind === 'admin'
  // Ancien lien enseignant (sans jeton) toujours accepté : il passe par la gate d'activation
  const isTeacherInvite = invite ? invite.kind === 'teacher' : params.invite === 'teacher'
  const prefilledSchoolId = invite?.schoolId ?? params.schoolId ?? ''
  const prefilledEmail = invite?.email ?? (params.email ? decodeURIComponent(params.email) : '')

  // Parent arrivé depuis le formulaire d'une école (?school=<slug>) : école imposée, liste masquée
  let lockedSchool: { id: string; name: string } | null = null
  if (!invite && !isTeacherInvite && params.school) {
    const [found] = await db
      .select({ id: schools.id, name: schools.name })
      .from(schools)
      .where(eq(schools.slug, params.school))
      .limit(1)
    lockedSchool = found ?? null
  }

  if (invalidInvite) {
    return (
      <div className="min-h-screen bg-[#f4f9f3] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-border p-8 text-center space-y-3">
          <h1 className="text-xl font-semibold text-foreground">Invitation invalide ou expirée</h1>
          <p className="text-sm text-muted-foreground">
            Ce lien n&apos;est plus valable. Demandez à l&apos;école de vous renvoyer l&apos;invitation.
          </p>
          <Link href="/auth/login" className="inline-block text-sm text-[#2d6a4f] hover:underline font-medium">
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  const schoolList = lockedSchool
    ? [lockedSchool]
    : await db
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
        invite ? isNull(schoolMembers.adminSubRole) : undefined,
      ))
      .limit(1)
    prefilledFullName = member?.fullName ?? ''
    prefilledPhone = formatPhone(member?.phone)
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
            inviteToken={invite ? params.token : undefined}
            lockedSchoolId={lockedSchool?.id}
            prefilledSchoolId={lockedSchool?.id ?? prefilledSchoolId}
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
