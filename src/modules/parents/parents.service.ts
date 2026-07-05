import { db } from '@/db'
import { students, parentStudents, guardians, schoolMembers, profiles } from '@/db/schema'
import { and, eq, asc } from 'drizzle-orm'
import type { StudentParentInfo, Guardian, ConnectedParent } from './parents.types'

export const parentsService = {
  async getAll(schoolId: string): Promise<StudentParentInfo[]> {
    const [studentRows, guardianRows, connectedRows] = await Promise.all([
      db
        .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
        .from(students)
        .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)))
        .orderBy(asc(students.lastName), asc(students.firstName)),

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

      db
        .select({
          studentId:      parentStudents.studentId,
          schoolMemberId: parentStudents.schoolMemberId,
          fullName:       profiles.fullName,
        })
        .from(parentStudents)
        .leftJoin(schoolMembers, eq(parentStudents.schoolMemberId, schoolMembers.id))
        .leftJoin(profiles, eq(schoolMembers.userId, profiles.userId))
        .where(eq(parentStudents.schoolId, schoolId)),
    ])

    const guardiansByStudent = guardianRows.reduce<Record<string, Guardian[]>>((acc, g) => {
      if (!acc[g.studentId]) acc[g.studentId] = []
      acc[g.studentId].push(g)
      return acc
    }, {})

    const connectedByStudent = connectedRows.reduce<Record<string, ConnectedParent[]>>((acc, r) => {
      if (!acc[r.studentId]) acc[r.studentId] = []
      acc[r.studentId].push({ schoolMemberId: r.schoolMemberId, fullName: r.fullName })
      return acc
    }, {})

    return studentRows.map(s => ({
      ...s,
      guardians: guardiansByStudent[s.id] ?? [],
      connectedParents: connectedByStudent[s.id] ?? [],
    }))
  },
}
