import { db } from '@/db'
import { registrationForms, registrations } from '@/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import type { FormType, FormItem, RegistrationForm, Registration } from './registrations.types'
import { DEFAULT_NEW_STUDENT_SCHEMA, DEFAULT_REENROLLMENT_SCHEMA } from './registrations.types'

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
      formData: (r.formData as Record<string, unknown>) ?? {},
      status: r.status as Registration['status'],
      submittedAt: r.submittedAt,
      reviewedBy: r.reviewedBy ?? null,
      reviewedAt: r.reviewedAt ?? null,
      notes: r.notes ?? null,
    }))
  },

  async submit(schoolId: string, formId: string | null, formData: Record<string, unknown>): Promise<Registration> {
    const [row] = await db
      .insert(registrations)
      .values({ schoolId, formId, formData, status: 'pending' })
      .returning()

    return {
      id: row.id,
      schoolId: row.schoolId,
      formId: row.formId ?? null,
      formData: (row.formData as Record<string, unknown>) ?? {},
      status: row.status as Registration['status'],
      submittedAt: row.submittedAt,
      reviewedBy: row.reviewedBy ?? null,
      reviewedAt: row.reviewedAt ?? null,
      notes: row.notes ?? null,
    }
  },
}
