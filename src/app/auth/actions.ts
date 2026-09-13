'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { profiles, schoolMembers } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

function translateAuthError(message: string): string {
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'Un compte existe déjà avec cet email'
  }
  const passwordLength = message.match(/Password should be at least (\d+) characters/)
  if (passwordLength) {
    return `Le mot de passe doit contenir au moins ${passwordLength[1]} caractères`
  }
  if (message.includes('Unable to validate email address') || message.includes('invalid format')) {
    return 'Adresse email invalide'
  }
  if (message.includes('email rate limit exceeded') || message.includes('rate limit')) {
    return "Trop de tentatives d'inscription. Veuillez réessayer dans quelques minutes."
  }
  return "Une erreur est survenue lors de l'inscription. Veuillez réessayer."
}

export async function signInAction(email: string, password: string) {
  const supabase = await createClient()
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email ou mot de passe incorrect' }
  }

  const userId = authData.user?.id
  let destination = '/admin-portal'

  if (userId) {
    const [member] = await db
      .select({ portalRoles: schoolMembers.portalRoles, isPending: schoolMembers.isPending })
      .from(schoolMembers)
      .where(and(eq(schoolMembers.userId, userId)))
      .limit(1)

    const roles = member?.portalRoles ?? []
    if (roles.includes('teacher')) {
      destination = '/teacher-portal'
    } else if (roles.includes('parent')) {
      destination = '/parent-portal'
    } else if (roles.includes('admin')) {
      destination = '/admin-portal'
    }
  }

  revalidatePath('/', 'layout')
  redirect(destination)
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export async function signUpAction(input: {
  fullName: string
  email: string
  schoolId: string
  phone: string
  isParent: boolean
  isTeacher: boolean
  isAdmin: boolean
  password: string
}): Promise<{ error?: string; needsConfirmation?: boolean } | void> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName } },
  })

  if (error) {
    console.error('[signUpAction] supabase.auth.signUp error:', error.message)
    return { error: translateAuthError(error.message) }
  }

  const userId = data.user?.id
  if (!userId) return { error: 'Erreur lors de la création du compte.' }

  await db
    .insert(profiles)
    .values({ userId, fullName: input.fullName, phone: input.phone })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { fullName: input.fullName, phone: input.phone },
    })

  // ── Flow admin invité ────────────────────────────────────────────
  if (input.isAdmin) {
    const [pendingRecord] = await db
      .select({ id: schoolMembers.id })
      .from(schoolMembers)
      .where(
        and(
          eq(schoolMembers.schoolId, input.schoolId),
          eq(schoolMembers.pendingEmail, input.email.toLowerCase()),
          eq(schoolMembers.userId, NIL_UUID),
          eq(schoolMembers.isPending, true),
        )
      )
      .limit(1)

    if (!pendingRecord) {
      return { error: "Aucune invitation administrateur trouvée pour cet email et cette école. Contactez l'équipe Qaf." }
    }

    await db
      .update(schoolMembers)
      .set({ userId, isPending: false, pendingEmail: null })
      .where(eq(schoolMembers.id, pendingRecord.id))

    if (!data.session) return { needsConfirmation: true }
    revalidatePath('/', 'layout')
    redirect('/admin-portal')
  }

  // ── Flows parent / enseignant ────────────────────────────────────
  const roles: string[] = []
  if (input.isParent) roles.push('parent')
  if (input.isTeacher) roles.push('teacher')
  if (roles.length === 0) roles.push('parent')

  if (input.isTeacher) {
    // Check for an admin-created pending record with this email
    const [adminRecord] = await db
      .select({ id: schoolMembers.id })
      .from(schoolMembers)
      .where(
        and(
          eq(schoolMembers.schoolId, input.schoolId),
          eq(schoolMembers.userId, NIL_UUID),
          eq(schoolMembers.pendingEmail, input.email.toLowerCase()),
        )
      )
      .limit(1)

    if (adminRecord) {
      // Link the real user to the admin-created record
      await db
        .update(schoolMembers)
        .set({ userId, pendingEmail: null })
        .where(eq(schoolMembers.id, adminRecord.id))
    } else {
      // No admin record — create a pending member (awaiting admin activation code)
      await db.insert(schoolMembers).values({
        userId,
        schoolId: input.schoolId,
        portalRoles: ['teacher'],
        isPending: true,
      })
    }

    if (!data.session) return { needsConfirmation: true }
    revalidatePath('/', 'layout')
    redirect('/teacher-portal')
  }

  // Parent (or combined parent+teacher — parent takes precedence for redirect)
  const [existing] = await db
    .select({ id: schoolMembers.id })
    .from(schoolMembers)
    .where(and(eq(schoolMembers.userId, userId), eq(schoolMembers.schoolId, input.schoolId)))
    .limit(1)

  if (!existing) {
    await db.insert(schoolMembers).values({
      userId,
      schoolId: input.schoolId,
      portalRoles: roles,
      isPending: false,
    })
  }

  if (!data.session) return { needsConfirmation: true }

  revalidatePath('/', 'layout')
  if (input.isParent) redirect('/parent-portal')
  redirect('/admin-portal')
}
