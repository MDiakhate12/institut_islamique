import { db } from '@/db'
import { registrationForms, registrations, students, guardians, parentStudents, schoolMembers, profiles, classes, classEnrollments } from '@/db/schema'
import { and, eq, desc, inArray, isNull } from 'drizzle-orm'
import type { FormType, FormItem, RegistrationForm, Registration, SystemFieldKey, RegistrationWithDetails } from './registrations.types'
import { DEFAULT_NEW_STUDENT_SCHEMA, DEFAULT_REENROLLMENT_SCHEMA } from './registrations.types'

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


const normalizeName = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()

/** Les ids de classe choisis dans la section « Choix des classes » (clés `class_<matière>`). */
export function selectedClassIds(formData: Record<string, unknown>): string[] {
  return Object.entries(formData)
    .filter(([k, v]) => k.startsWith('class_') && typeof v === 'string' && v.length > 0)
    .map(([, v]) => v as string)
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

  /** IDs of students (among the given list) who already have a registration for this academic year. */
  async getRegisteredStudentIds(schoolId: string, studentIds: string[], academicYear: string): Promise<Set<string>> {
    if (studentIds.length === 0) return new Set()

    const rows = await db
      .select({ studentId: registrations.studentId })
      .from(registrations)
      .where(and(
        eq(registrations.schoolId, schoolId),
        eq(registrations.academicYear, academicYear),
        inArray(registrations.studentId, studentIds),
      ))

    return new Set(rows.map(r => r.studentId).filter((id): id is string => !!id))
  },

  /** Statut de la dernière inscription de chaque élève pour l'année (élèves sans inscription absents). */
  async getRegistrationStatuses(schoolId: string, studentIds: string[], academicYear: string): Promise<Record<string, Registration['status']>> {
    if (studentIds.length === 0) return {}
    const rows = await db
      .select({ studentId: registrations.studentId, status: registrations.status })
      .from(registrations)
      .where(and(
        eq(registrations.schoolId, schoolId),
        eq(registrations.academicYear, academicYear),
        inArray(registrations.studentId, studentIds),
      ))
      .orderBy(registrations.submittedAt) // la plus récente écrase les précédentes
    const out: Record<string, Registration['status']> = {}
    for (const r of rows) if (r.studentId) out[r.studentId] = r.status as Registration['status']
    return out
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
        reviewedAt:       registrations.reviewedAt,
        reviewNotes:      registrations.notes,
        reviewedByName:   profiles.fullName,
        formType:         registrationForms.formType,
        formSchema:       registrationForms.formSchema,
        studentFirstName: students.firstName,
        studentLastName:  students.lastName,
        studentCustomId:  students.studentCustomId,
        studentBirthDate: students.birthDate,
        studentGender:    students.gender,
      })
      .from(registrations)
      .leftJoin(registrationForms, eq(registrations.formId, registrationForms.id))
      .leftJoin(students, eq(registrations.studentId, students.id))
      .leftJoin(schoolMembers, eq(schoolMembers.id, registrations.reviewedBy))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(eq(registrations.schoolId, schoolId))
      .orderBy(desc(registrations.submittedAt))

    if (rows.length === 0) return []

    const studentIds = rows.map(r => r.studentId).filter((id): id is string => !!id)

    type GuardianRow = { studentId: string; firstName: string | null; lastName: string; email: string | null; phone: string | null }

    const guardianRows = studentIds.length > 0
      ? await db
          .select({
            studentId: guardians.studentId,
            firstName: guardians.firstName,
            lastName:  guardians.lastName,
            email:     guardians.email,
            phone:     guardians.phone,
          })
          .from(guardians)
          .where(inArray(guardians.studentId, studentIds))
      : ([] as GuardianRow[])

    const guardiansByStudent = guardianRows.reduce<Record<string, GuardianRow[]>>((acc, g) => {
      if (!acc[g.studentId]) acc[g.studentId] = []
      acc[g.studentId].push(g)
      return acc
    }, {})

    return rows.map(r => {
      const schema = (r.formSchema as FormItem[] | null) ?? []
      const keyToId = buildKeyToIdMap(schema)
      const formData = (r.formData as Record<string, unknown>) ?? {}
      const get = (key: SystemFieldKey): string | null => {
        const fieldId = keyToId[key]
        return fieldId ? ((formData[fieldId] as string | undefined) ?? null) : null
      }

      // formData stores catalog codes directly (e.g. "QRN-100")
      const selectedClasses = Object.entries(formData)
        .filter(([key, val]) => key.startsWith('class_') && val)
        .map(([, code]) => ({ fullCode: code as string, name: '' }))

      // Consents: checkbox values stored as boolean in formData
      const photoConsent  = (formData['cf-photo-consent'] === true || formData['cf-photo-consent'] === 'true') ? true
                          : (formData['cf-photo-consent'] === false || formData['cf-photo-consent'] === 'false') ? false
                          : null
      const policyConsent = (formData['cf-acknowledge'] === true || formData['cf-acknowledge'] === 'true') ? true
                          : (formData['cf-acknowledge'] === false || formData['cf-acknowledge'] === 'false') ? false
                          : null

      // Custom fields: any field not system/class/consent
      const customFields: { label: string; value: string }[] = []
      for (const item of schema) {
        if (item.kind !== 'section') continue
        for (const field of item.fields) {
          if (field.kind !== 'custom_field') continue
          if (field.id === 'cf-photo-consent' || field.id === 'cf-acknowledge' || field.id === 'cf-comments') continue
          const val = formData[field.id]
          if (val !== undefined && val !== null && val !== '') {
            customFields.push({ label: field.label, value: String(val) })
          }
        }
      }

      const parents = (r.studentId ? guardiansByStudent[r.studentId] : undefined) ?? []

      return {
        id:               r.id,
        studentId:        r.studentId ?? null,
        studentCustomId:  r.studentCustomId ?? null,
        studentFirstName: r.studentFirstName ?? null,
        studentLastName:  r.studentLastName ?? null,
        studentBirthDate: r.studentBirthDate ?? null,
        studentGender:    r.studentGender ?? null,
        formType:         (r.formType as FormType | null) ?? null,
        status:           r.status as Registration['status'],
        reviewedAt:       r.reviewedAt ?? null,
        reviewNotes:      r.reviewNotes ?? null,
        reviewedByName:   r.reviewedByName ?? null,
        submittedAt:      r.submittedAt,
        grade:            get('schoolGrade'),
        regularSchool:    get('regularSchool'),
        paymentFrequency: get('paymentFrequency'),
        financialAid:     get('financialAid'),
        photoConsent,
        policyConsent,
        classes:          selectedClasses,
        parents:          parents.map(p => ({ name: `${p.firstName} ${p.lastName}`.trim(), email: p.email, phone: p.phone })),
        customFields,
      }
    })
  },

  async submit(
    schoolId: string,
    formId: string | null,
    formData: Record<string, unknown>,
    studentId?: string,
    academicYear?: string,
    submittedByMemberId?: string,
  ): Promise<Registration> {
    const [row] = await db
      .insert(registrations)
      .values({
        schoolId, formId, formData, status: 'pending',
        studentId: studentId ?? null, academicYear: academicYear ?? '',
        submittedByMemberId: submittedByMemberId ?? null,
      })
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

  /** Décision de l'admin. Renvoie de quoi notifier la famille, ou null si l'inscription n'est pas dans l'école. */
  async review(
    schoolId: string,
    registrationId: string,
    reviewerMemberId: string,
    status: 'approved' | 'rejected',
    notes: string | null,
  ): Promise<{
    studentId: string | null
    studentName: string
    formType: FormType | null
    formData: Record<string, unknown>
    formSchema: FormItem[]
    recipientMemberIds: string[]
  } | null> {
    const [row] = await db
      .update(registrations)
      .set({ status, notes, reviewedBy: reviewerMemberId, reviewedAt: new Date() })
      .where(and(eq(registrations.id, registrationId), eq(registrations.schoolId, schoolId)))
      .returning({
        studentId: registrations.studentId,
        formId: registrations.formId,
        formData: registrations.formData,
        submittedByMemberId: registrations.submittedByMemberId,
      })
    if (!row) return null

    const [[student], [form], parents] = await Promise.all([
      row.studentId
        ? db.select({ firstName: students.firstName, lastName: students.lastName }).from(students).where(eq(students.id, row.studentId)).limit(1)
        : Promise.resolve([]),
      row.formId
        ? db.select({ formSchema: registrationForms.formSchema, formType: registrationForms.formType }).from(registrationForms).where(eq(registrationForms.id, row.formId)).limit(1)
        : Promise.resolve([]),
      row.studentId
        ? db.select({ memberId: parentStudents.schoolMemberId }).from(parentStudents)
            .where(and(eq(parentStudents.studentId, row.studentId), eq(parentStudents.schoolId, schoolId)))
        : Promise.resolve([]),
    ])

    // Parents liés à l'élève + parent qui a soumis l'inscription depuis son portail (dédoublonnés)
    const recipientMemberIds = Array.from(new Set([
      ...parents.map(p => p.memberId),
      ...(row.submittedByMemberId ? [row.submittedByMemberId] : []),
    ]))

    return {
      studentId: row.studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : 'votre enfant',
      formType: (form?.formType as FormType | undefined) ?? null,
      formData: (row.formData as Record<string, unknown>) ?? {},
      formSchema: (form?.formSchema as FormItem[] | undefined) ?? [],
      recipientMemberIds,
    }
  },

  /** Élève déjà connu de l'école : même prénom, nom et date de naissance (accents/casse ignorés). */
  async findDuplicateStudent(
    schoolId: string, firstName: string, lastName: string, birthDate: string | undefined,
  ): Promise<{ id: string } | null> {
    if (!birthDate) return null // sans date de naissance, un homonyme n'est pas forcément un doublon
    const rows = await db
      .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
      .from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.birthDate, birthDate)))
    const f = normalizeName(firstName), l = normalizeName(lastName)
    const match = rows.find(r => normalizeName(r.firstName) === f && normalizeName(r.lastName) === l)
    return match ? { id: match.id } : null
  },

  async isLinkedToParent(memberId: string, studentId: string, schoolId: string): Promise<boolean> {
    const [row] = await db
      .select({ studentId: parentStudents.studentId })
      .from(parentStudents)
      .where(and(
        eq(parentStudents.schoolMemberId, memberId),
        eq(parentStudents.studentId, studentId),
        eq(parentStudents.schoolId, schoolId),
      ))
      .limit(1)
    return !!row
  },

  /**
   * Effets d'une décision sur l'élève :
   * - nouvel élève : actif seulement une fois approuvé (créé inactif à la soumission) ;
   * - approbation : inscription dans les classes choisies par la famille (si la section existe).
   * Une réinscription refusée ne désactive pas un élève déjà scolarisé.
   */
  async applyReviewToStudent(
    schoolId: string,
    studentId: string,
    formType: FormType | null,
    status: 'approved' | 'rejected',
    formData: Record<string, unknown>,
  ): Promise<{ enrolledClassIds: string[] }> {
    if (formType === 'new_student') {
      await db.update(students)
        .set({ isActive: status === 'approved' })
        .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    }
    if (status !== 'approved') return { enrolledClassIds: [] }

    const wanted = selectedClassIds(formData)
    if (wanted.length === 0) return { enrolledClassIds: [] }
    // Uniquement des classes actives de cette école (l'id vient des réponses du formulaire)
    const valid = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true), inArray(classes.id, wanted)))
    const already = await db
      .select({ classId: classEnrollments.classId })
      .from(classEnrollments)
      .where(and(eq(classEnrollments.studentId, studentId), isNull(classEnrollments.unenrolledAt)))
    const alreadySet = new Set(already.map(a => a.classId))
    const toEnroll = valid.map(v => v.id).filter(id => !alreadySet.has(id))
    if (toEnroll.length > 0) {
      await db.insert(classEnrollments)
        .values(toEnroll.map(classId => ({ classId, studentId, schoolId })))
        .onConflictDoNothing()
    }
    return { enrolledClassIds: toEnroll }
  },

}
