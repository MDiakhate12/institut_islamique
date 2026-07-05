import { db } from '@/db'
import { students, classEnrollments, classes, guardians } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import type { CreateStudentInput, UpdateStudentInput } from './students.schema'
import type { Student, StudentListItem, GuardianSummary } from './students.types'

function generateCustomId(): string {
  return `${Math.floor(Math.random() * 900_000_000 + 100_000_000)}-1`
}

export const studentsService = {
  async getBySchool(schoolId: string): Promise<StudentListItem[]> {
    const [studentRows, guardianRows] = await Promise.all([
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
          id:           guardians.id,
          studentId:    guardians.studentId,
          relationship: guardians.relationship,
          firstName:    guardians.firstName,
          lastName:     guardians.lastName,
          email:        guardians.email,
          phone:        guardians.phone,
          isPrimary:    guardians.isPrimary,
        })
        .from(guardians)
        .where(eq(guardians.schoolId, schoolId)),
    ])

    const guardiansByStudent = guardianRows.reduce<Record<string, GuardianSummary[]>>((acc, g) => {
      if (!acc[g.studentId]) acc[g.studentId] = []
      acc[g.studentId].push(g)
      return acc
    }, {})

    return studentRows.map(s => ({
      ...s,
      guardians: guardiansByStudent[s.id] ?? [],
    }))
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

    if (data.parentPhone?.trim()) {
      await db.insert(guardians).values({
        schoolId,
        studentId:    student.id,
        firstName:    'Parent',
        relationship: 'guardian',
        phone:        data.parentPhone.trim(),
        isPrimary:    true,
      })
    }

    return student
  },

  async update(schoolId: string, studentId: string, data: UpdateStudentInput): Promise<Student> {
    const [updated] = await db
      .update(students)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .returning()
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
