'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { profiles, schoolMembers } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

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
      .select({ portalRoles: schoolMembers.portalRoles })
      .from(schoolMembers)
      .where(and(eq(schoolMembers.userId, userId), eq(schoolMembers.isPending, false)))
      .limit(1)

    const roles = member?.portalRoles ?? []
    if (roles.includes('admin')) {
      destination = '/admin-portal'
    } else if (roles.includes('teacher')) {
      destination = '/teacher-portal'
    } else if (roles.includes('parent')) {
      destination = '/parent-portal'
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
  password: string
}): Promise<{ error?: string; needsConfirmation?: boolean } | void> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName } },
  })

  if (error) return { error: error.message }

  const userId = data.user?.id
  if (!userId) return { error: 'Erreur lors de la création du compte.' }

  await db
    .insert(profiles)
    .values({ userId, fullName: input.fullName, phone: input.phone })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { fullName: input.fullName, phone: input.phone },
    })

  const roles: string[] = []
  if (input.isParent) roles.push('parent')
  if (input.isTeacher) roles.push('teacher')
  if (roles.length === 0) roles.push('parent')

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

  if (!data.session) {
    return { needsConfirmation: true }
  }

  revalidatePath('/', 'layout')
  if (input.isParent) redirect('/parent-portal')
  redirect('/admin-portal')
}
