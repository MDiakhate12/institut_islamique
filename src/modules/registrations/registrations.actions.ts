'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { ok, err, unauthorized } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { registrationsService, buildKeyToIdMap } from './registrations.service'
import { studentsService } from '@/modules/students/students.service'
import { scheduledClassesService } from '@/modules/classes/classes.service'
import { parentsService } from '@/modules/parents/parents.service'
import type { FormType, FormItem, RegistrationForm, SystemFieldKey, RegistrationClassItem, RegistrationWithDetails } from './registrations.types'
import { db } from '@/db'
import { schools, guardians } from '@/db/schema'
import { eq } from 'drizzle-orm'

const PATH = '/admin-portal/registration-forms'

// ── Admin actions ──────────────────────────────────────────────────────────────

export async function getRegistrationFormAction(
  formType: FormType
): Promise<ActionResult<RegistrationForm>> {
  const session = await requireSession()
  try {
    const form = await registrationsService.getOrCreateForm(session.schoolId, formType)
    return ok(form)
  } catch (e) {
    console.error('[getRegistrationFormAction]', e)
    return err('Impossible de charger le formulaire')
  }
}

export async function updateRegistrationFormAction(
  formType: FormType,
  schema: FormItem[]
): Promise<ActionResult<RegistrationForm>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    const form = await registrationsService.updateFormSchema(session.schoolId, formType, schema)
    revalidatePath(PATH)
    return ok(form)
  } catch (e) {
    console.error('[updateRegistrationFormAction]', e)
    return err('Impossible de sauvegarder le formulaire')
  }
}

export async function resetRegistrationFormAction(
  formType: FormType
): Promise<ActionResult<RegistrationForm>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    const form = await registrationsService.resetForm(session.schoolId, formType)
    revalidatePath(PATH)
    return ok(form)
  } catch (e) {
    console.error('[resetRegistrationFormAction]', e)
    return err('Impossible de réinitialiser le formulaire')
  }
}

// ── Public submission action (no auth) ────────────────────────────────────────

export async function submitRegistrationAction(
  schoolSlug: string,
  formType: FormType,
  formData: Record<string, unknown>,
  knownStudentId?: string,
  submitterMemberId?: string,
): Promise<ActionResult<{ id: string; studentId?: string }>> {
  try {
    // 1. Find school by slug
    const [school] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.slug, schoolSlug))
      .limit(1)

    if (!school) return err('École introuvable')

    // 2. Get the form (to read the field→id mapping)
    const form = await registrationsService.getOrCreateForm(school.id, formType)
    const keyToId = buildKeyToIdMap(form.formSchema)

    const get = (key: SystemFieldKey): string | undefined => {
      const fieldId = keyToId[key]
      return fieldId ? (formData[fieldId] as string | undefined) : undefined
    }

    // 3. For new_student: create a student record + guardian records
    let studentId: string | undefined = knownStudentId
    if (formType === 'new_student' && !studentId) {
      const firstName = get('firstName')?.trim()
      const lastName  = get('lastName')?.trim()
      const genderRaw = get('gender')

      if (firstName && lastName && genderRaw) {
        const gender: 'male' | 'female' =
          genderRaw === 'Masculin' || genderRaw === 'male' ? 'male' : 'female'

        const student = await studentsService.create(school.id, {
          firstName,
          lastName,
          gender,
          isActive:  true,
          birthDate: get('birthDate') || undefined,
        })
        studentId = student.id

        // Create guardian records from form data
        const fatherName = get('fatherName')?.trim()
        const motherName = get('motherName')?.trim()
        if (fatherName) {
          await db.insert(guardians).values({
            schoolId: school.id,
            studentId,
            relationship:   'father',
            firstName:      fatherName,
            isPrimary:      true,
            email:          get('primaryEmail')   || null,
            phone:          get('primaryPhone')   || null,
            emergencyPhone: get('secondaryPhone') || null,
          })
        }
        if (motherName) {
          await db.insert(guardians).values({
            schoolId: school.id,
            studentId,
            relationship: 'mother',
            firstName:    motherName,
            email:        get('secondaryEmail') || null,
          })
        }
      }

      // Auto-link the newly created student to the submitting parent, if known
      if (studentId && submitterMemberId) {
        await parentsService.linkStudentsToParent(submitterMemberId, [studentId], school.id)
      }
    }

    // 4. Save registration with proper studentId FK
    const registration = await registrationsService.submit(school.id, form.id, formData, studentId)
    return ok({ id: registration.id, studentId })
  } catch (e) {
    console.error('[submitRegistrationAction]', e)
    return err("Impossible de soumettre l'inscription")
  }
}

// ── Get form for public rendering (no auth) ───────────────────────────────────

export async function getPublicRegistrationFormAction(
  schoolSlug: string,
  formType: FormType
): Promise<ActionResult<{ form: RegistrationForm; schoolName: string; gradeOptions: string[]; financialOptions: string[]; academicYear: string; classes: RegistrationClassItem[] }>> {
  try {
    const [school] = await db
      .select({ id: schools.id, name: schools.name, settings: schools.settings })
      .from(schools)
      .where(eq(schools.slug, schoolSlug))
      .limit(1)

    if (!school) return err('École introuvable')

    const [form, classes] = await Promise.all([
      registrationsService.getOrCreateForm(school.id, formType),
      scheduledClassesService.getForRegistration(school.id),
    ])
    const settings         = school.settings as { gradeLevels?: string[]; financialOptions?: string[]; academicYear?: string } | null
    const gradeOptions     = settings?.gradeLevels      ?? []
    const financialOptions = settings?.financialOptions ?? []
    const academicYear     = settings?.academicYear     ?? '2025-2026'

    return ok({ form, schoolName: school.name, gradeOptions, financialOptions, academicYear, classes })
  } catch (e) {
    console.error('[getPublicRegistrationFormAction]', e)
    return err('Impossible de charger le formulaire')
  }
}

// ── Admin: get classes for the form builder preview ───────────────────────────

export async function getAdminRegistrationClassesAction(): Promise<ActionResult<RegistrationClassItem[]>> {
  const session = await requireSession()
  try {
    const data = await scheduledClassesService.getForRegistration(session.schoolId)
    return ok(data)
  } catch (e) {
    console.error('[getAdminRegistrationClassesAction]', e)
    return err('Impossible de charger les classes')
  }
}

// ── Admin: list submitted registrations ────────────────────────────────────────

export async function getRegistrationsAction(): Promise<ActionResult<RegistrationWithDetails[]>> {
  const session = await requireSession()
  if (!session.roles.includes('admin')) return unauthorized()

  try {
    const data = await registrationsService.getBySchoolWithDetails(session.schoolId)
    return ok(data)
  } catch (e) {
    console.error('[getRegistrationsAction]', e)
    return err('Impossible de charger les inscriptions')
  }
}
