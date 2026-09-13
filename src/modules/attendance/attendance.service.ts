import { db } from '@/db'
import {
  attendance, attendanceRecords, teacherAttendanceClasses,
  classes, classCatalog, classEnrollments, students, schoolMembers, profiles,
  parentStudents, schools,
} from '@/db/schema'
import { DEFAULT_SETTINGS } from '@/db/schema/schools'
import type { SchoolSettings } from '@/db/schema/schools'
import { eq, and, or, notInArray, inArray, isNull, gte, lte } from 'drizzle-orm'
import type {
  PinnedAttendanceClass, AttendanceClassOption,
  AttendanceStudent, SubmitAttendanceInput, AttendanceStatus, ExistingAttendance,
  AdminDayOverview, AdminClassOverview, AdminStudentEntry,
  ParentAttendanceEntry,
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

  // ── Admin: full school overview for a date ──────────────────────
  async getAdminDayOverview(schoolId: string, date: string): Promise<AdminDayOverview> {
    const classRows = await db
      .select({
        classId:     classes.id,
        name:        classes.name,
        room:        classes.room,
        section:     classes.section,
        teacherId:   classes.teacherId,
        catalogCode: classCatalog.code,
        subjectCode: classCatalog.subjectCode,
        teacherName: profiles.fullName,
      })
      .from(classes)
      .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
      .leftJoin(schoolMembers, eq(schoolMembers.id, classes.teacherId))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true)))
      .orderBy(classes.room, classes.section)

    if (classRows.length === 0) {
      return {
        totalClasses: 0, submittedCount: 0, missingCount: 0,
        totalStudents: 0, totalPresent: 0, totalLate: 0,
        totalAbsent: 0, totalExcused: 0, totalUnmarked: 0,
        teacherCount: 0, teachersSubmitted: 0,
        classes: [], studentEntries: [],
      }
    }

    const classIds = classRows.map(r => r.classId)

    const enrollRows = await db
      .select({
        classId:   classEnrollments.classId,
        studentId: students.id,
        firstName: students.firstName,
        lastName:  students.lastName,
      })
      .from(classEnrollments)
      .innerJoin(students, eq(students.id, classEnrollments.studentId))
      .where(and(
        eq(classEnrollments.schoolId, schoolId),
        inArray(classEnrollments.classId, classIds),
        isNull(classEnrollments.unenrolledAt),
      ))

    const attHeaders = await db
      .select({ id: attendance.id, classId: attendance.classId })
      .from(attendance)
      .where(and(
        eq(attendance.schoolId, schoolId),
        eq(attendance.date, date),
        inArray(attendance.classId, classIds),
      ))

    const attIdList = attHeaders.map(h => h.id)
    const recordRows = attIdList.length > 0
      ? await db
          .select({
            attendanceId: attendanceRecords.attendanceId,
            studentId:    attendanceRecords.studentId,
            status:       attendanceRecords.status,
          })
          .from(attendanceRecords)
          .where(inArray(attendanceRecords.attendanceId, attIdList))
      : []

    const attByClass = new Map<string, string>()
    for (const h of attHeaders) attByClass.set(h.classId, h.id)

    const recordsByAtt = new Map<string, Map<string, AttendanceStatus>>()
    for (const r of recordRows) {
      if (!r.studentId) continue
      if (!recordsByAtt.has(r.attendanceId)) recordsByAtt.set(r.attendanceId, new Map())
      recordsByAtt.get(r.attendanceId)!.set(r.studentId, r.status as AttendanceStatus)
    }

    const enrollByClass = new Map<string, { studentId: string; firstName: string; lastName: string }[]>()
    for (const e of enrollRows) {
      const list = enrollByClass.get(e.classId) ?? []
      list.push(e)
      enrollByClass.set(e.classId, list)
    }

    const classOverviews: AdminClassOverview[] = []
    const studentEntries: AdminStudentEntry[] = []
    let totalStudents = 0, totalPresent = 0, totalLate = 0
    let totalAbsent = 0, totalExcused = 0, totalUnmarked = 0
    let submittedCount = 0
    const teacherIds = new Set<string>()
    const teachersSubmittedIds = new Set<string>()

    for (const c of classRows) {
      const enrolled = enrollByClass.get(c.classId) ?? []
      const attId = attByClass.get(c.classId)
      const statusMap = attId ? (recordsByAtt.get(attId) ?? new Map()) : new Map<string, AttendanceStatus>()
      const isSubmitted = !!attId

      if (isSubmitted) submittedCount++
      if (c.teacherId) {
        teacherIds.add(c.teacherId)
        if (isSubmitted) teachersSubmittedIds.add(c.teacherId)
      }

      let presentCount = 0, lateCount = 0, absentCount = 0
      let excusedCount = 0, unmarkedCount = 0

      for (const s of enrolled) {
        const status = statusMap.get(s.studentId) ?? null
        if (status === 'present') presentCount++
        else if (status === 'late') lateCount++
        else if (status === 'absent') absentCount++
        else if (status === 'excused') excusedCount++
        else unmarkedCount++

        studentEntries.push({
          studentId: s.studentId,
          firstName: s.firstName,
          lastName:  s.lastName,
          classId:   c.classId,
          className: c.name,
          status,
        })
      }

      totalStudents += enrolled.length
      totalPresent  += presentCount
      totalLate     += lateCount
      totalAbsent   += absentCount
      totalExcused  += excusedCount
      totalUnmarked += unmarkedCount

      classOverviews.push({
        classId:      c.classId,
        name:         c.name,
        catalogCode:  c.catalogCode ?? '',
        subjectCode:  c.subjectCode ?? '',
        section:      c.section ?? null,
        room:         c.room ?? null,
        teacherName:  c.teacherName ?? null,
        teacherId:    c.teacherId ?? null,
        studentCount: enrolled.length,
        isSubmitted,
        presentCount,
        lateCount,
        absentCount,
        excusedCount,
        unmarkedCount,
      })
    }

    return {
      totalClasses:      classRows.length,
      submittedCount,
      missingCount:      classRows.length - submittedCount,
      totalStudents,
      totalPresent,
      totalLate,
      totalAbsent,
      totalExcused,
      totalUnmarked,
      teacherCount:      teacherIds.size,
      teachersSubmitted: teachersSubmittedIds.size,
      classes:           classOverviews,
      studentEntries,
    }
  },

  // ── Parent: attendance timeline for one child ────────────────────────────
  async getParentTimeline(
    schoolId: string,
    memberId: string,
    studentId: string,
  ): Promise<ParentAttendanceEntry[]> {
    // 1. Verify parent ↔ student link
    const [link] = await db
      .select({ studentId: parentStudents.studentId })
      .from(parentStudents)
      .where(and(
        eq(parentStudents.schoolMemberId, memberId),
        eq(parentStudents.studentId, studentId),
        eq(parentStudents.schoolId, schoolId),
      ))
      .limit(1)

    if (!link) return []

    // 2. School settings for yearStartDate + schoolDays
    const [school] = await db
      .select({ settings: schools.settings })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1)

    const settings: SchoolSettings = { ...DEFAULT_SETTINGS, ...(school?.settings ?? {}) }

    // 3. Student's active class enrollments
    const enrollRows = await db
      .select({
        classId:     classEnrollments.classId,
        className:   classes.name,
        catalogCode: classCatalog.code,
        section:     classes.section,
      })
      .from(classEnrollments)
      .leftJoin(classes, eq(classes.id, classEnrollments.classId))
      .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
      .where(and(
        eq(classEnrollments.studentId, studentId),
        eq(classEnrollments.schoolId, schoolId),
        isNull(classEnrollments.unenrolledAt),
      ))

    if (enrollRows.length === 0) return []

    const classIds = enrollRows.map(r => r.classId)

    // 4. Generate expected class dates (school days from yearStart to today)
    const today = new Date()
    const expectedDates = generateExpectedDates(settings.yearStartDate, settings.schoolDays, today)
    if (expectedDates.length === 0) return []

    const dateMin = expectedDates[expectedDates.length - 1]
    const dateMax = expectedDates[0]

    // 5. Attendance headers in range (with submitter info)
    const attHeaders = await db
      .select({
        id:              attendance.id,
        classId:         attendance.classId,
        date:            attendance.date,
        submittedAt:     attendance.submittedAt,
        submittedByName: profiles.fullName,
      })
      .from(attendance)
      .leftJoin(schoolMembers, eq(schoolMembers.id, attendance.submittedBy))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(and(
        eq(attendance.schoolId, schoolId),
        inArray(attendance.classId, classIds),
        gte(attendance.date, dateMin),
        lte(attendance.date, dateMax),
      ))

    // 6. Records for this student
    const attIds = attHeaders.map(h => h.id)
    const recordRows = attIds.length > 0
      ? await db
          .select({ attendanceId: attendanceRecords.attendanceId, status: attendanceRecords.status })
          .from(attendanceRecords)
          .where(and(
            inArray(attendanceRecords.attendanceId, attIds),
            eq(attendanceRecords.studentId, studentId),
          ))
      : []

    // 7. Build lookup maps
    const attByKey = new Map<string, { id: string; submittedAt: Date | null; submittedByName: string | null }>()
    for (const h of attHeaders) {
      attByKey.set(`${h.classId}|${h.date}`, {
        id: h.id,
        submittedAt: h.submittedAt ?? null,
        submittedByName: h.submittedByName ?? null,
      })
    }

    const statusByAttId = new Map<string, AttendanceStatus>()
    for (const r of recordRows) {
      statusByAttId.set(r.attendanceId, r.status as AttendanceStatus)
    }

    // 8. Merge into timeline (most recent first)
    const entries: ParentAttendanceEntry[] = []
    for (const date of expectedDates) {
      for (const cls of enrollRows) {
        const att = attByKey.get(`${cls.classId}|${date}`)
        entries.push({
          date,
          classId:         cls.classId,
          className:       cls.className ?? '',
          catalogCode:     cls.catalogCode ?? '',
          section:         cls.section ?? null,
          status:          att ? (statusByAttId.get(att.id) ?? null) : null,
          submittedAt:     att?.submittedAt ?? null,
          submittedByName: att?.submittedByName ?? null,
        })
      }
    }

    return entries
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function generateExpectedDates(
  yearStartDate: string | null,
  schoolDays: string[],
  today: Date,
): string[] {
  const schoolDayNums = new Set(schoolDays.map(d => DAY_NAMES.indexOf(d)).filter(n => n >= 0))
  if (schoolDayNums.size === 0) return []

  const todayNorm = new Date(today)
  todayNorm.setHours(0, 0, 0, 0)

  // Fallback: 3 months ago if no yearStartDate
  const start = yearStartDate
    ? new Date(yearStartDate)
    : new Date(todayNorm.getFullYear(), todayNorm.getMonth() - 3, todayNorm.getDate())
  start.setHours(0, 0, 0, 0)

  // Cap at 1 year back
  const cap = new Date(todayNorm)
  cap.setFullYear(cap.getFullYear() - 1)
  const from = start < cap ? cap : start

  const dates: string[] = []
  const cursor = new Date(from)
  while (cursor <= todayNorm) {
    if (schoolDayNums.has(cursor.getDay())) {
      const y = cursor.getFullYear()
      const m = String(cursor.getMonth() + 1).padStart(2, '0')
      const d = String(cursor.getDate()).padStart(2, '0')
      dates.push(`${y}-${m}-${d}`)
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates.reverse() // most recent first
}
