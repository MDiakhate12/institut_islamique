'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth/session'
import { ok, err, unauthorized } from '@/lib/result'
import type { ActionResult } from '@/lib/result'
import { registrationsService } from './registrations.service'
import { studentsService } from '@/modules/students/students.service'
import { scheduledClassesService } from '@/modules/classes/classes.service'
import type { FormType, FormItem, RegistrationForm, SystemFieldKey, RegistrationClassItem } from './registrations.types'
import { db } from '@/db'
import { schools } from '@/db/schema'
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a map from system field keys to their form field IDs using the stored schema. */
function buildKeyToIdMap(schema: FormItem[]): Partial<Record<SystemFieldKey, string>> {
  const map: Partial<Record<SystemFieldKey, string>> = {}
  for (const item of schema) {
    if (item.kind === 'section') {
      for (const field of item.fields) {
        if (field.kind === 'system_field') {
          map[field.fieldKey] = field.id
        }
      }
    }
  }
  return map
}

// ── Public submission action (no auth) ────────────────────────────────────────

export async function submitRegistrationAction(
  schoolSlug: string,
  formType: FormType,
  formData: Record<string, unknown>
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

    // 3. For new_student: create a student record immediately
    let studentId: string | undefined
    if (formType === 'new_student') {
      const firstName = get('firstName')?.trim()
      const lastName  = get('lastName')?.trim()
      const genderRaw = get('gender')

      if (firstName && lastName && genderRaw) {
        // Map French labels to DB enum values
        const gender: 'male' | 'female' =
          genderRaw === 'Masculin' || genderRaw === 'male' ? 'male' : 'female'

        const student = await studentsService.create(school.id, {
          firstName,
          lastName,
          gender,
          isActive:      true,
          birthDate:     get('birthDate')      || undefined,
          parentName1:   get('fatherName')     || undefined,
          parentName2:   get('motherName')     || undefined,
          parentEmail1:  get('primaryEmail')   || undefined,
          parentEmail2:  get('secondaryEmail') || undefined,
          parentPhone:   get('primaryPhone')   || undefined,
          emergencyPhone: get('secondaryPhone') || undefined,
        })
        studentId = student.id
      }
    }

    // 4. Save registration — embed studentId in formData so it's retrievable later
    const enrichedData = studentId
      ? { ...formData, _studentId: studentId }
      : formData

    const registration = await registrationsService.submit(school.id, form.id, enrichedData)
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
): Promise<ActionResult<{ form: RegistrationForm; schoolName: string; gradeOptions: string[]; academicYear: string; classes: RegistrationClassItem[] }>> {
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
    const settings     = school.settings as { gradeLevels?: string[]; academicYear?: string } | null
    const gradeOptions = settings?.gradeLevels  ?? []
    const academicYear = settings?.academicYear ?? '2025-2026'

    return ok({ form, schoolName: school.name, gradeOptions, academicYear, classes })
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
