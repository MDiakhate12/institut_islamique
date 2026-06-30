import { db } from '@/db'
import { students, parentStudents, profiles } from '@/db/schema'
import { and, eq, asc } from 'drizzle-orm'
import type { StudentParentInfo } from './parents.types'

export const parentsService = {
  async getAll(schoolId: string): Promise<StudentParentInfo[]> {
    const [studentRows, connectedRows] = await Promise.all([
      db
        .select({
          id: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          parentName1: students.parentName1,
          parentEmail1: students.parentEmail1,
          parentName2: students.parentName2,
          parentEmail2: students.parentEmail2,
          parentPhone: students.parentPhone,
        })
        .from(students)
        .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)))
        .orderBy(asc(students.lastName), asc(students.firstName)),

      db
        .select({
          studentId: parentStudents.studentId,
          userId: parentStudents.parentUserId,
          fullName: profiles.fullName,
        })
        .from(parentStudents)
        .leftJoin(profiles, eq(parentStudents.parentUserId, profiles.userId))
        .where(eq(parentStudents.schoolId, schoolId)),
    ])

    const connectedByStudent = connectedRows.reduce<Record<string, Array<{ userId: string; fullName: string | null }>>>(
      (acc, row) => {
        if (!acc[row.studentId]) acc[row.studentId] = []
        acc[row.studentId].push({ userId: row.userId, fullName: row.fullName })
        return acc
      },
      {},
    )

    return studentRows.map(s => ({
      ...s,
      connectedParents: connectedByStudent[s.id] ?? [],
    }))
  },
}
