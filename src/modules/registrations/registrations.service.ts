import { db } from '@/db'
import { registrationForms, registrations, students, guardians } from '@/db/schema'
import { and, eq, desc, inArray } from 'drizzle-orm'
import type { FormType, FormItem, RegistrationForm, Registration, SystemFieldKey, RegistrationWithDetails } from './registrations.types'
import { DEFAULT_NEW_STUDENT_SCHEMA, DEFAULT_REENROLLMENT_SCHEMA } from './registrations.types'
import { scheduledClassesService } from '@/modules/classes/classes.service'

/** Build a map from system field keys to their form field IDs using the stored schema. */
export function buildKeyToIdMap(schema: FormItem[]): Partial<Record<SystemFieldKey, string>> {
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

export const registrationsService = {

  // ── Registration Forms ──────────────────────────────────────────────────────

  /** Get a form config, creating a default one if it doesn't exist yet. */
  async getOrCreateForm(schoolId: string, formType: FormType): Promise<RegistrationForm> {
    const [existing] = await db
      .select()
      .from(registrationForms)
      .where(and(eq(registrationForms.schoolId, schoolId), eq(registrationForms.formType, formType)))
      .limit(1)

    if (existing) {
      return {
        ...existing,
        formType: existing.formType as FormType,
        formSchema: (existing.formSchema as FormItem[]) ?? [],
      }
    }

    // Create default form
    const defaultSchema = formType === 'new_student'
      ? DEFAULT_NEW_STUDENT_SCHEMA
      : DEFAULT_REENROLLMENT_SCHEMA

    const [created] = await db
      .insert(registrationForms)
      .values({ schoolId, formType, formSchema: defaultSchema })
      .returning()

    return {
      ...created,
      formType: created.formType as FormType,
      formSchema: (created.formSchema as FormItem[]) ?? [],
    }
  },

  /** Save updated form schema. */
  async updateFormSchema(schoolId: string, formType: FormType, schema: FormItem[]): Promise<RegistrationForm> {
    const [existing] = await db
      .select({ id: registrationForms.id })
      .from(registrationForms)
      .where(and(eq(registrationForms.schoolId, schoolId), eq(registrationForms.formType, formType)))
      .limit(1)

    if (!existing) {
      const [row] = await db
        .insert(registrationForms)
        .values({ schoolId, formType, formSchema: schema })
        .returning()
      return { ...row, formType: row.formType as FormType, formSchema: schema }
    }

    const [row] = await db
      .update(registrationForms)
      .set({ formSchema: schema, updatedAt: new Date() })
      .where(eq(registrationForms.id, existing.id))
      .returning()

    return { ...row, formType: row.formType as FormType, formSchema: schema }
  },

  /** Reset form to default schema. */
  async resetForm(schoolId: string, formType: FormType): Promise<RegistrationForm> {
    const defaultSchema = formType === 'new_student'
      ? DEFAULT_NEW_STUDENT_SCHEMA
      : DEFAULT_REENROLLMENT_SCHEMA
    return this.updateFormSchema(schoolId, formType, defaultSchema)
  },

  // ── Registrations (submissions) ─────────────────────────────────────────────

  /** IDs of students (among the given list) who already have a registration on file. */
  async getRegisteredStudentIds(schoolId: string, studentIds: string[]): Promise<Set<string>> {
    if (studentIds.length === 0) return new Set()

    const rows = await db
      .select({ studentId: registrations.studentId })
      .from(registrations)
      .where(and(eq(registrations.schoolId, schoolId), inArray(registrations.studentId, studentIds)))

    return new Set(rows.map(r => r.studentId).filter((id): id is string => !!id))
  },

  async getBySchool(schoolId: string): Promise<Registration[]> {
    const rows = await db
      .select()
      .from(registrations)
      .where(eq(registrations.schoolId, schoolId))
      .orderBy(desc(registrations.submittedAt))

    return rows.map(r => ({
      id: r.id,
      schoolId: r.schoolId,
      formId: r.formId ?? null,
      studentId: r.studentId ?? null,
      formData: (r.formData as Record<string, unknown>) ?? {},
      status: r.status as Registration['status'],
      submittedAt: r.submittedAt,
      reviewedBy: r.reviewedBy ?? null,
      reviewedAt: r.reviewedAt ?? null,
      notes: r.notes ?? null,
    }))
  },

  /** Registrations joined with student/guardian/class details, for the admin list. */
  async getBySchoolWithDetails(schoolId: string): Promise<RegistrationWithDetails[]> {
    const rows = await db
      .select({
        id:               registrations.id,
        studentId:        registrations.studentId,
        formData:         registrations.formData,
        status:           registrations.status,
        submittedAt:      registrations.submittedAt,
        formType:         registrationForms.formType,
        formSchema:       registrationForms.formSchema,
        studentFirstName: students.firstName,
        studentLastName:  students.lastName,
        studentCustomId:  students.studentCustomId,
        studentBirthDate: students.birthDate,
      })
      .from(registrations)
      .leftJoin(registrationForms, eq(registrations.formId, registrationForms.id))
      .leftJoin(students, eq(registrations.studentId, students.id))
      .where(eq(registrations.schoolId, schoolId))
      .orderBy(desc(registrations.submittedAt))

    if (rows.length === 0) return []

    const studentIds = rows.map(r => r.studentId).filter((id): id is string => !!id)

    type GuardianRow = { studentId: string; firstName: string; lastName: string; email: string | null; phone: string | null }

    const [guardianRows, classItems] = await Promise.all([
      studentIds.length > 0
        ? db
            .select({
              studentId: guardians.studentId,
              firstName: guardians.firstName,
              lastName:  guardians.lastName,
              email:     guardians.email,
              phone:     guardians.phone,
            })
            .from(guardians)
            .where(inArray(guardians.studentId, studentIds))
        : Promise.resolve([] as GuardianRow[]),
      scheduledClassesService.getForRegistration(schoolId),
    ])

    const guardiansByStudent = guardianRows.reduce<Record<string, GuardianRow[]>>((acc, g) => {
      if (!acc[g.studentId]) acc[g.studentId] = []
      acc[g.studentId].push(g)
      return acc
    }, {})

    const classById = new Map(classItems.map(c => [c.id, c]))

    return rows.map(r => {
      const schema = (r.formSchema as FormItem[] | null) ?? []
      const keyToId = buildKeyToIdMap(schema)
      const formData = (r.formData as Record<string, unknown>) ?? {}
      const get = (key: SystemFieldKey): string | null => {
        const fieldId = keyToId[key]
        return fieldId ? ((formData[fieldId] as string | undefined) ?? null) : null
      }

      const selectedClasses = Object.entries(formData)
        .filter(([key]) => key.startsWith('class_'))
        .map(([, classId]) => classById.get(classId as string))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map(c => ({ fullCode: c.fullCode, name: c.name }))

      const parents = (r.studentId ? guardiansByStudent[r.studentId] : undefined) ?? []

      return {
        id:               r.id,
        studentId:        r.studentId ?? null,
        studentCustomId:  r.studentCustomId ?? null,
        studentFirstName: r.studentFirstName ?? null,
        studentLastName:  r.studentLastName ?? null,
        studentBirthDate: r.studentBirthDate ?? null,
        formType:         (r.formType as FormType | null) ?? null,
        status:           r.status as Registration['status'],
        submittedAt:      r.submittedAt,
        grade:            get('schoolGrade'),
        regularSchool:    get('regularSchool'),
        paymentFrequency: get('paymentFrequency'),
        financialAid:     get('financialAid'),
        classes:          selectedClasses,
        parents:          parents.map(p => ({ name: `${p.firstName} ${p.lastName}`.trim(), email: p.email, phone: p.phone })),
      }
    })
  },

  async submit(
    schoolId: string,
    formId: string | null,
    formData: Record<string, unknown>,
    studentId?: string,
  ): Promise<Registration> {
    const [row] = await db
      .insert(registrations)
      .values({ schoolId, formId, formData, status: 'pending', studentId: studentId ?? null })
      .returning()

    return {
      id: row.id,
      schoolId: row.schoolId,
      formId: row.formId ?? null,
      studentId: row.studentId ?? null,
      formData: (row.formData as Record<string, unknown>) ?? {},
      status: row.status as Registration['status'],
      submittedAt: row.submittedAt,
      reviewedBy: row.reviewedBy ?? null,
      reviewedAt: row.reviewedAt ?? null,
      notes: row.notes ?? null,
    }
  },
}
