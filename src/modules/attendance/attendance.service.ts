import { db } from '@/db'
import {
  attendance, attendanceRecords, teacherAttendanceClasses,
  classes, classCatalog, classEnrollments, students, schoolMembers, profiles,
} from '@/db/schema'
import { eq, and, or, notInArray } from 'drizzle-orm'
import type {
  PinnedAttendanceClass, AttendanceClassOption,
  AttendanceStudent, SubmitAttendanceInput, AttendanceStatus, ExistingAttendance,
} from './attendance.types'

export const attendanceService = {
  // ── Pinned classes ──────────────────────────────────────────────
  async getPinnedClasses(schoolId: string, memberId: string): Promise<PinnedAttendanceClass[]> {
    const rows = await db
      .select({
        pinnedId:    teacherAttendanceClasses.id,
        classId:     classes.id,
        catalogCode: classCatalog.code,
        subjectCode: classCatalog.subjectCode,
        name:        classes.name,
        section:     classes.section,
        teacherName: profiles.fullName,
      })
      .from(teacherAttendanceClasses)
      .innerJoin(classes, eq(classes.id, teacherAttendanceClasses.classId))
      .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
      .leftJoin(schoolMembers, eq(schoolMembers.id, classes.teacherId))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(
        and(
          eq(teacherAttendanceClasses.schoolMemberId, memberId),
          eq(teacherAttendanceClasses.schoolId, schoolId),
        )
      )

    return rows.map(r => ({
      pinnedId:    r.pinnedId,
      classId:     r.classId,
      catalogCode: r.catalogCode ?? '',
      subjectCode: r.subjectCode ?? '',
      name:        r.name,
      section:     r.section ?? null,
      teacherName: r.teacherName ?? null,
    }))
  },

  async addPinnedClass(schoolId: string, memberId: string, classId: string): Promise<void> {
    await db
      .insert(teacherAttendanceClasses)
      .values({ schoolId, schoolMemberId: memberId, classId })
      .onConflictDoNothing()
  },

  async removePinnedClass(pinnedId: string): Promise<void> {
    await db.delete(teacherAttendanceClasses).where(eq(teacherAttendanceClasses.id, pinnedId))
  },

  // ── Class options ───────────────────────────────────────────────
  async getClassOptions(schoolId: string, memberId: string, excludeClassIds: string[] = []): Promise<AttendanceClassOption[]> {
    const rows = await db
      .select({
        id:          classes.id,
        catalogCode: classCatalog.code,
        subjectCode: classCatalog.subjectCode,
        levelNumber: classCatalog.levelNumber,
        name:        classes.name,
        section:     classes.section,
      })
      .from(classes)
      .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
      .where(and(
        eq(classes.schoolId, schoolId),
        eq(classes.isActive, true),
        or(
          eq(classes.teacherId, memberId),
          eq(classes.assistantTeacherId, memberId),
        ),
        excludeClassIds.length > 0
          ? notInArray(classes.id, excludeClassIds)
          : undefined,
      ))
      .orderBy(classCatalog.subjectCode, classCatalog.levelNumber, classes.section)

    return rows.map(r => ({
      id:          r.id,
      catalogCode: r.catalogCode ?? '',
      subjectCode: r.subjectCode ?? '',
      levelNumber: r.levelNumber ?? null,
      name:        r.name,
      section:     r.section ?? null,
    }))
  },

  // ── Students in a class ─────────────────────────────────────────
  async getStudentsByClass(schoolId: string, classId: string): Promise<AttendanceStudent[]> {
    const rows = await db
      .select({
        studentId: students.id,
        firstName: students.firstName,
        lastName:  students.lastName,
        customId:  students.studentCustomId,
      })
      .from(classEnrollments)
      .innerJoin(students, eq(students.id, classEnrollments.studentId))
      .where(
        and(
          eq(classEnrollments.classId, classId),
          eq(classEnrollments.schoolId, schoolId),
          eq(students.schoolId, schoolId),
        )
      )
      .orderBy(students.lastName, students.firstName)

    return rows.map(r => ({
      studentId: r.studentId,
      firstName: r.firstName,
      lastName:  r.lastName,
      customId:  r.customId ?? null,
    }))
  },

  // ── Existing attendance for a class/date ────────────────────────
  async getExisting(schoolId: string, classId: string, date: string): Promise<ExistingAttendance | null> {
    const [att] = await db
      .select({ id: attendance.id })
      .from(attendance)
      .where(
        and(
          eq(attendance.schoolId, schoolId),
          eq(attendance.classId, classId),
          eq(attendance.date, date),
        )
      )
      .limit(1)

    if (!att) return null

    const records = await db
      .select({ studentId: attendanceRecords.studentId, status: attendanceRecords.status })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.attendanceId, att.id))

    return {
      attendanceId: att.id,
      records: Object.fromEntries(records.map(r => [r.studentId, r.status as AttendanceStatus])),
    }
  },

  // ── Submit (upsert) attendance ──────────────────────────────────
  async submit(schoolId: string, memberId: string, input: SubmitAttendanceInput): Promise<void> {
    const { classId, date, records } = input

    // Find or create the attendance header
    const [existing] = await db
      .select({ id: attendance.id })
      .from(attendance)
      .where(and(
        eq(attendance.schoolId, schoolId),
        eq(attendance.classId, classId),
        eq(attendance.date, date),
      ))
      .limit(1)

    let attId: string
    if (existing) {
      await db
        .update(attendance)
        .set({ submittedBy: memberId, submittedAt: new Date() })
        .where(eq(attendance.id, existing.id))
      attId = existing.id
    } else {
      const [created] = await db
        .insert(attendance)
        .values({ schoolId, classId, date, submittedBy: memberId, submittedAt: new Date() })
        .returning({ id: attendance.id })
      attId = created.id
    }

    // Replace all records
    await db.delete(attendanceRecords).where(eq(attendanceRecords.attendanceId, attId))

    if (records.length > 0) {
      await db.insert(attendanceRecords).values(
        records.map(r => ({ attendanceId: attId, studentId: r.studentId, status: r.status }))
      )
    }
  },
}
