import { db } from '@/db'
import { students, classEnrollments, classes } from '@/db/schema'
import { eq, and, isNull, ilike, or, desc } from 'drizzle-orm'
import type { CreateStudentInput, UpdateStudentInput } from './students.schema'
import type { Student, StudentListItem } from './students.types'

export const studentsService = {
  // READ — liste avec classe active
  async getBySchool(schoolId: string): Promise<StudentListItem[]> {
    const rows = await db
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        gender: students.gender,
        birthDate: students.birthDate,
        isActive: students.isActive,
        createdAt: students.createdAt,
        activeClassName: classes.name,
        activeClassId: classes.id,
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
      .orderBy(desc(students.createdAt))

    return rows
  },

  // READ — un seul élève
  async getById(schoolId: string, studentId: string): Promise<Student | null> {
    const [student] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .limit(1)

    return student ?? null
  },

  // CREATE
  async create(schoolId: string, data: CreateStudentInput): Promise<Student> {
    const [student] = await db
      .insert(students)
      .values({
        ...data,
        schoolId,
        birthDate: data.birthDate ?? null,
        notes: data.notes ?? null,
      })
      .returning()

    return student
  },

  // UPDATE
  async update(
    schoolId: string,
    studentId: string,
    data: UpdateStudentInput
  ): Promise<Student> {
    const [updated] = await db
      .update(students)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .returning()

    return updated
  },

  // SOFT DELETE — on désactive plutôt que supprimer
  async deactivate(schoolId: string, studentId: string): Promise<void> {
    await db
      .update(students)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
  },

  // COUNT
  async countBySchool(schoolId: string): Promise<number> {
    const result = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)))

    return result.length
  },
}
