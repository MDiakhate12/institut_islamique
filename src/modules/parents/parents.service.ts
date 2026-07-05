import { db } from '@/db'
import {
  students, parentStudents, guardians, schoolMembers, profiles,
  classEnrollments, classes, otpCodes,
} from '@/db/schema'
import { and, eq, asc, isNull, inArray, gt, desc } from 'drizzle-orm'
import type {
  StudentParentInfo, Guardian, ConnectedParent,
  ChildWithClasses, EnrolledClass,
} from './parents.types'

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

  async getMemberId(userId: string, schoolId: string): Promise<string | null> {
    const [row] = await db
      .select({ id: schoolMembers.id })
      .from(schoolMembers)
      .where(and(eq(schoolMembers.userId, userId), eq(schoolMembers.schoolId, schoolId)))
      .limit(1)
    return row?.id ?? null
  },

  async generateAndStoreOtp(phone: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await db.insert(otpCodes).values({ phone, code, expiresAt })
    return code
  },

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const now = new Date()
    const [row] = await db
      .select({ id: otpCodes.id })
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, code),
          isNull(otpCodes.usedAt),
          gt(otpCodes.expiresAt, now),
        )
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1)

    if (!row) return false

    await db.update(otpCodes).set({ usedAt: now }).where(eq(otpCodes.id, row.id))
    return true
  },

  async findStudentsByGuardianPhone(
    phone: string,
    schoolId: string,
  ): Promise<{ studentId: string; firstName: string; lastName: string }[]> {
    const normalize = (p: string) => p.replace(/\D/g, '').slice(-9)
    const normalizedInput = normalize(phone)

    const allGuardians = await db
      .select({ studentId: guardians.studentId, phone: guardians.phone })
      .from(guardians)
      .where(eq(guardians.schoolId, schoolId))

    const matchingIds = allGuardians
      .filter(g => g.phone && normalize(g.phone) === normalizedInput)
      .map(g => g.studentId)

    if (matchingIds.length === 0) return []

    const matched = await db
      .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
      .from(students)
      .where(inArray(students.id, matchingIds))

    return matched.map(s => ({ studentId: s.id, firstName: s.firstName, lastName: s.lastName }))
  },

  async linkStudentsToParent(
    schoolMemberId: string,
    studentIds: string[],
    schoolId: string,
  ): Promise<void> {
    if (studentIds.length === 0) return

    const existing = await db
      .select({ studentId: parentStudents.studentId })
      .from(parentStudents)
      .where(
        and(
          eq(parentStudents.schoolMemberId, schoolMemberId),
          eq(parentStudents.schoolId, schoolId),
        )
      )

    const existingIds = new Set(existing.map(r => r.studentId))
    const toInsert = studentIds.filter(id => !existingIds.has(id))
    if (toInsert.length === 0) return

    await db.insert(parentStudents).values(
      toInsert.map(studentId => ({ schoolMemberId, studentId, schoolId }))
    )
  },

  async getChildrenWithClasses(
    schoolMemberId: string,
    schoolId: string,
  ): Promise<ChildWithClasses[]> {
    const linked = await db
      .select({ studentId: parentStudents.studentId })
      .from(parentStudents)
      .where(
        and(
          eq(parentStudents.schoolMemberId, schoolMemberId),
          eq(parentStudents.schoolId, schoolId),
        )
      )

    if (linked.length === 0) return []

    const studentIds = linked.map(r => r.studentId)

    const [studentRows, enrollmentRows] = await Promise.all([
      db
        .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
        .from(students)
        .where(inArray(students.id, studentIds))
        .orderBy(asc(students.firstName)),

      db
        .select({
          studentId: classEnrollments.studentId,
          classId:   classEnrollments.classId,
          className: classes.name,
          room:      classes.room,
          section:   classes.section,
        })
        .from(classEnrollments)
        .leftJoin(classes, eq(classEnrollments.classId, classes.id))
        .where(
          and(
            inArray(classEnrollments.studentId, studentIds),
            eq(classEnrollments.schoolId, schoolId),
            isNull(classEnrollments.unenrolledAt),
          )
        ),
    ])

    const classesByStudent = enrollmentRows.reduce<Record<string, EnrolledClass[]>>((acc, r) => {
      if (!acc[r.studentId]) acc[r.studentId] = []
      if (r.classId && r.className) {
        acc[r.studentId].push({
          classId:   r.classId,
          className: r.className,
          room:      r.room,
          section:   r.section,
        })
      }
      return acc
    }, {})

    return studentRows.map(s => ({
      studentId: s.id,
      firstName: s.firstName,
      lastName:  s.lastName,
      classes:   classesByStudent[s.id] ?? [],
    }))
  },
}
