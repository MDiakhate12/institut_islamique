import { db } from '@/db'
import { students, classEnrollments, classes } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import type { CreateStudentInput, UpdateStudentInput } from './students.schema'
import type { Student, StudentListItem } from './students.types'

function generateCustomId(): string {
  return `${Math.floor(Math.random() * 900_000_000 + 100_000_000)}-1`
}

export const studentsService = {
  // READ — liste complète avec classe active + paiements
  async getBySchool(schoolId: string): Promise<StudentListItem[]> {
    const rows = await db
      .select({
        id:              students.id,
        firstName:       students.firstName,
        lastName:        students.lastName,
        gender:          students.gender,
        birthDate:       students.birthDate,
        isActive:        students.isActive,
        createdAt:       students.createdAt,
        parentPhone:     students.parentPhone,
        parentName1:     students.parentName1,
        parentName2:     students.parentName2,
        parentEmail1:    students.parentEmail1,
        parentEmail2:    students.parentEmail2,
        emergencyPhone:  students.emergencyPhone,
        studentCustomId: students.studentCustomId,
        notes:           students.notes,
        // Classe active
        activeClassName: classes.name,
        activeClassId:   classes.id,
        academicYear:    classes.academicYear,
        enrollmentId:    classEnrollments.id,
        enrolledAt:      classEnrollments.enrolledAt,
        // Paiements
        paidT1: classEnrollments.paidT1,
        paidT2: classEnrollments.paidT2,
        paidT3: classEnrollments.paidT3,
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
        ...data,
        schoolId,
        birthDate:    data.birthDate    || null,
        parentPhone:  data.parentPhone  || null,
        parentName1:  data.parentName1  || null,
        parentName2:  data.parentName2  || null,
        parentEmail1: data.parentEmail1 || null,
        parentEmail2: data.parentEmail2 || null,
        emergencyPhone: data.emergencyPhone || null,
        studentCustomId: generateCustomId(),
        notes:        data.notes        || null,
      })
      .returning()
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

  // Mise à jour du statut de paiement d'une inscription
  async updateEnrollmentPayments(
    enrollmentId: string,
    paidT1: boolean,
    paidT2: boolean,
    paidT3: boolean,
  ): Promise<void> {
    await db
      .update(classEnrollments)
      .set({ paidT1, paidT2, paidT3 })
      .where(eq(classEnrollments.id, enrollmentId))
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
