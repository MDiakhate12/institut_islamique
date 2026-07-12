import { db } from '@/db'
import { students, classEnrollments, classes, guardians, payments } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import type { CreateStudentInput, UpdateStudentInput } from './students.schema'
import type { Student, StudentListItem, GuardianSummary } from './students.types'

function generateCustomId(): string {
  return `${Math.floor(Math.random() * 900_000_000 + 100_000_000)}-1`
}

export const studentsService = {
  async getBySchool(schoolId: string): Promise<StudentListItem[]> {
    const [studentRows, guardianRows, paymentRows] = await Promise.all([
      db
        .select({
          id:              students.id,
          firstName:       students.firstName,
          lastName:        students.lastName,
          gender:          students.gender,
          birthDate:       students.birthDate,
          isActive:        students.isActive,
          createdAt:       students.createdAt,
          studentCustomId: students.studentCustomId,
          notes:           students.notes,
          activeClassName: classes.name,
          activeClassId:   classes.id,
          academicYear:    classes.academicYear,
          enrollmentId:    classEnrollments.id,
          enrolledAt:      classEnrollments.enrolledAt,
        })
        .from(students)
        .leftJoin(
          classEnrollments,
          and(
            eq(classEnrollments.studentId, students.id),
            isNull(classEnrollments.unenrolledAt)
          )
        )
        .leftJoin(classes, eq(classes.id, classEnrollments.classId))
        .where(eq(students.schoolId, schoolId))
        .orderBy(desc(students.createdAt)),

      db
        .select({
          id:             guardians.id,
          studentId:      guardians.studentId,
          relationship:   guardians.relationship,
          firstName:      guardians.firstName,
          lastName:       guardians.lastName,
          email:          guardians.email,
          phone:          guardians.phone,
          emergencyPhone: guardians.emergencyPhone,
          isPrimary:      guardians.isPrimary,
        })
        .from(guardians)
        .where(eq(guardians.schoolId, schoolId)),

      db
        .select({
          studentId: payments.studentId,
          period:    payments.period,
          status:    payments.status,
        })
        .from(payments)
        .where(and(eq(payments.schoolId, schoolId), eq(payments.status, 'verified'))),
    ])

    const guardiansByStudent = guardianRows.reduce<Record<string, GuardianSummary[]>>((acc, g) => {
      if (!acc[g.studentId]) acc[g.studentId] = []
      acc[g.studentId].push(g)
      return acc
    }, {})

    type PaymentRow = { studentId: string | null; period: string; status: string }
    const paymentsByStudent = (paymentRows as PaymentRow[]).reduce<Record<string, string[]>>((acc, p) => {
      if (!p.studentId) return acc
      if (!acc[p.studentId]) acc[p.studentId] = []
      acc[p.studentId].push(p.period)
      return acc
    }, {})

    return studentRows.map(s => {
      const periods = paymentsByStudent[s.id] ?? []
      const annually = periods.includes('annually')
      return {
        ...s,
        guardians:  guardiansByStudent[s.id] ?? [],
        paymentT1: annually || periods.includes('trimester_1'),
        paymentT2: annually || periods.includes('trimester_2'),
        paymentT3: annually || periods.includes('trimester_3'),
      }
    })
  },

  async getById(schoolId: string, studentId: string): Promise<Student | null> {
    const [student] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .limit(1)
    return student ?? null
  },

  async create(schoolId: string, data: CreateStudentInput): Promise<Student> {
    const [student] = await db
      .insert(students)
      .values({
        schoolId,
        firstName:       data.firstName,
        lastName:        data.lastName,
        gender:          data.gender,
        isActive:        data.isActive,
        birthDate:       data.birthDate || null,
        notes:           data.notes     || null,
        studentCustomId: generateCustomId(),
      })
      .returning()

    if (data.parentPhone?.trim() || data.parentName1?.trim() || data.email1?.trim()) {
      await db.insert(guardians).values({
        schoolId,
        studentId:      student.id,
        firstName:      data.parentName1?.trim() || 'Parent',
        relationship:   'father',
        phone:          data.parentPhone?.trim() || null,
        email:          data.email1?.trim()       || null,
        emergencyPhone: data.emergencyPhone?.trim() || null,
        isPrimary:      true,
      })
    }

    if (data.parentName2?.trim()) {
      await db.insert(guardians).values({
        schoolId,
        studentId:    student.id,
        firstName:    data.parentName2.trim(),
        relationship: 'mother',
        email:        data.email2?.trim() || null,
        isPrimary:    false,
      })
    }

    return student
  },

  async update(schoolId: string, studentId: string, data: UpdateStudentInput): Promise<Student> {
    const { parentPhone, parentName1, parentName2, email1, email2, emergencyPhone, enrollmentYear, ...studentData } = data

    const [updated] = await db
      .update(students)
      .set({ ...studentData, updatedAt: new Date() })
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .returning()

    const needsGuardianUpdate = (
      parentPhone !== undefined ||
      parentName1 !== undefined ||
      email1      !== undefined ||
      emergencyPhone !== undefined
    )

    const needsMotherUpdate = parentName2 !== undefined || email2 !== undefined

    if (needsGuardianUpdate || needsMotherUpdate) {
      const existingGuardians = await db
        .select()
        .from(guardians)
        .where(eq(guardians.studentId, studentId))

      const father = existingGuardians.find(g => g.relationship === 'father' || g.isPrimary) ?? null
      const mother = existingGuardians.find(g => g.relationship === 'mother') ?? null

      if (needsGuardianUpdate) {
        const patch: Record<string, unknown> = { updatedAt: new Date() }
        if (parentName1   !== undefined) patch.firstName      = parentName1   || 'Parent'
        if (parentPhone   !== undefined) patch.phone          = parentPhone.trim()  || null
        if (email1        !== undefined) patch.email          = email1        || null
        if (emergencyPhone !== undefined) patch.emergencyPhone = emergencyPhone || null

        if (father) {
          await db.update(guardians).set(patch).where(eq(guardians.id, father.id))
        } else {
          await db.insert(guardians).values({
            schoolId,
            studentId,
            relationship:   'father',
            firstName:      (parentName1 || 'Parent'),
            isPrimary:      true,
            phone:          parentPhone?.trim() || null,
            email:          email1        || null,
            emergencyPhone: emergencyPhone || null,
          })
        }
      }

      if (needsMotherUpdate) {
        const patch: Record<string, unknown> = { updatedAt: new Date() }
        if (parentName2 !== undefined) patch.firstName = parentName2 || ''
        if (email2      !== undefined) patch.email     = email2      || null

        if (mother) {
          await db.update(guardians).set(patch).where(eq(guardians.id, mother.id))
        } else if (parentName2) {
          await db.insert(guardians).values({
            schoolId,
            studentId,
            relationship: 'mother',
            firstName:    parentName2,
            isPrimary:    false,
            email:        email2 || null,
          })
        }
      }
    }

    return updated
  },

  async deactivate(schoolId: string, studentId: string): Promise<void> {
    await db
      .update(students)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
  },

  async delete(schoolId: string, studentId: string): Promise<void> {
    await db
      .delete(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
  },
}
