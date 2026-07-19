import { db } from '@/db'
import {
  students, classEnrollments, classes, classCatalog,
  guardians, payments, schoolMembers, profiles,
  attendance, attendanceRecords, homework, homeworkGrades,
  examResults, schools,
} from '@/db/schema'
import { eq, and, isNull, desc, inArray, count, max, or, sum } from 'drizzle-orm'
import type { CreateStudentInput, UpdateStudentInput } from './students.schema'
import type {
  Student, StudentListItem, GuardianSummary, StudentEnrollment,
  StudentPayment, StudentAttendanceDay, StudentHomeworkItem,
  StudentExamResult, StudentReportCardData,
} from './students.types'

function generateCustomId(): string {
  return `${Math.floor(Math.random() * 900_000_000 + 100_000_000)}-1`
}

// Build academic year array: [year-1, year, year+1] from "YYYY-YYYY+1"
function buildYearOptions(currentYear: string): string[] {
  const match = currentYear.match(/^(\d{4})-(\d{4})$/)
  if (!match) return [currentYear]
  const start = parseInt(match[1])
  return [
    `${start - 1}-${start}`,
    `${start}-${start + 1}`,
    `${start + 1}-${start + 2}`,
  ]
}

export const studentsService = {
  async getBySchool(schoolId: string): Promise<StudentListItem[]> {
    const [
      studentRows,
      guardianRows,
      enrollmentRows,
      paymentRows,
      attendanceStatRows,
      lastAttendanceRows,
    ] = await Promise.all([
      // 1. Base students
      db
        .select()
        .from(students)
        .where(eq(students.schoolId, schoolId))
        .orderBy(desc(students.createdAt)),

      // 2. Guardians
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

      // 3. Active enrollments with class + catalog + teacher
      db
        .select({
          enrollmentId: classEnrollments.id,
          studentId:    classEnrollments.studentId,
          classId:      classes.id,
          classCode:    classCatalog.code,
          className:    classes.name,
          teacherName:  profiles.fullName,
          paymentPlan:  classEnrollments.paymentPlan,
          enrolledAt:   classEnrollments.enrolledAt,
        })
        .from(classEnrollments)
        .innerJoin(classes, eq(classes.id, classEnrollments.classId))
        .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
        .leftJoin(schoolMembers, eq(schoolMembers.id, classes.teacherId))
        .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
        .where(and(eq(classEnrollments.schoolId, schoolId), isNull(classEnrollments.unenrolledAt))),

      // 4. Verified payments
      db
        .select({
          studentId: payments.studentId,
          period:    payments.period,
          status:    payments.status,
        })
        .from(payments)
        .where(and(eq(payments.schoolId, schoolId), eq(payments.status, 'verified'))),

      // 5. Attendance counts grouped by student + status
      db
        .select({
          studentId: attendanceRecords.studentId,
          status:    attendanceRecords.status,
          cnt:       count(),
        })
        .from(attendanceRecords)
        .innerJoin(attendance, eq(attendance.id, attendanceRecords.attendanceId))
        .where(eq(attendance.schoolId, schoolId))
        .groupBy(attendanceRecords.studentId, attendanceRecords.status),

      // 6. Last attendance date (present or late)
      db
        .select({
          studentId: attendanceRecords.studentId,
          lastDate:  max(attendance.date),
        })
        .from(attendanceRecords)
        .innerJoin(attendance, eq(attendance.id, attendanceRecords.attendanceId))
        .where(and(
          eq(attendance.schoolId, schoolId),
          or(
            eq(attendanceRecords.status, 'present'),
            eq(attendanceRecords.status, 'late'),
          ),
        ))
        .groupBy(attendanceRecords.studentId),
    ])

    // Build lookup maps
    const guardiansByStudent = guardianRows.reduce<Record<string, GuardianSummary[]>>((acc, g) => {
      if (!acc[g.studentId]) acc[g.studentId] = []
      acc[g.studentId].push(g as GuardianSummary)
      return acc
    }, {})

    const enrollmentsByStudent = enrollmentRows.reduce<Record<string, typeof enrollmentRows>>((acc, e) => {
      if (!acc[e.studentId]) acc[e.studentId] = []
      acc[e.studentId].push(e)
      return acc
    }, {})

    type PaymentRow = { studentId: string | null; period: string }
    const paymentsByStudent = (paymentRows as PaymentRow[]).reduce<Record<string, string[]>>((acc, p) => {
      if (!p.studentId) return acc
      if (!acc[p.studentId]) acc[p.studentId] = []
      acc[p.studentId].push(p.period)
      return acc
    }, {})

    type StatAcc = Record<string, { present: number; late: number; absent: number; excused: number }>
    const attendanceStats = attendanceStatRows.reduce<StatAcc>((acc, row) => {
      if (!acc[row.studentId]) acc[row.studentId] = { present: 0, late: 0, absent: 0, excused: 0 }
      const s = row.status as 'present' | 'late' | 'absent' | 'excused'
      acc[row.studentId][s] = Number(row.cnt)
      return acc
    }, {})

    const lastByStudent = lastAttendanceRows.reduce<Record<string, string | null>>((acc, r) => {
      acc[r.studentId] = r.lastDate ?? null
      return acc
    }, {})

    return studentRows.map(s => {
      const periods   = paymentsByStudent[s.id] ?? []
      const annually  = periods.includes('annually')
      const paidT1    = annually || periods.includes('trimester_1')
      const paidT2    = annually || periods.includes('trimester_2')
      const paidT3    = annually || periods.includes('trimester_3')

      const rawEnrollments = enrollmentsByStudent[s.id] ?? []
      const enrollments: StudentEnrollment[] = rawEnrollments.map(e => ({
        enrollmentId: e.enrollmentId,
        classId:      e.classId,
        classCode:    e.classCode ?? '',
        className:    e.className,
        teacherName:  e.teacherName ?? null,
        paymentPlan:  e.paymentPlan ?? 'trimestrial',
        paidT1,
        paidT2,
        paidT3,
      }))

      const gList   = guardiansByStudent[s.id] ?? []
      const father  = gList.find(g => g.relationship === 'father' || g.isPrimary)
      const stats   = attendanceStats[s.id] ?? { present: 0, late: 0, absent: 0, excused: 0 }

      return {
        id:               s.id,
        firstName:        s.firstName,
        lastName:         s.lastName,
        gender:           s.gender,
        birthDate:        s.birthDate,
        isActive:         s.isActive,
        createdAt:        s.createdAt,
        studentCustomId:  s.studentCustomId,
        notes:            s.notes,
        enrollmentYear:   s.enrollmentYear,
        enrollments,
        phone:            father?.phone ?? null,
        guardians:        gList,
        enrolledAt:       rawEnrollments[0]?.enrolledAt ?? null,
        attendancePresent:  stats.present,
        attendanceLate:     stats.late,
        attendanceAbsent:   stats.absent,
        attendanceExcused:  stats.excused,
        lastAttendanceDate: lastByStudent[s.id] ?? null,
        paymentT1: paidT1,
        paymentT2: paidT2,
        paymentT3: paidT3,
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
        birthDate:       data.birthDate  || null,
        notes:           data.notes      || null,
        enrollmentYear:  data.enrollmentYear || null,
        studentCustomId: generateCustomId(),
      })
      .returning()

    // Father guardian
    if (data.parentPhone?.trim() || data.parentName1?.trim() || data.email1?.trim()) {
      await db.insert(guardians).values({
        schoolId,
        studentId:      student.id,
        firstName:      data.parentName1?.trim() || 'Parent',
        lastName:       '',
        relationship:   'father',
        phone:          data.parentPhone?.trim()   || null,
        email:          data.email1?.trim()        || null,
        emergencyPhone: data.emergencyPhone?.trim() || null,
        isPrimary:      true,
      })
    }

    // Mother guardian
    if (data.parentName2?.trim()) {
      await db.insert(guardians).values({
        schoolId,
        studentId:    student.id,
        firstName:    data.parentName2.trim(),
        lastName:     '',
        relationship: 'mother',
        email:        data.email2?.trim() || null,
        isPrimary:    false,
      })
    }

    // Enroll in classes if provided
    if (data.classIdsToAdd?.length) {
      for (const classId of data.classIdsToAdd) {
        await db.insert(classEnrollments).values({
          schoolId,
          studentId: student.id,
          classId,
        })
      }

      // Create payment records if any trimester is marked paid
      const periods: string[] = []
      if (data.paymentT1) periods.push('trimester_1')
      if (data.paymentT2) periods.push('trimester_2')
      if (data.paymentT3) periods.push('trimester_3')
      for (const period of periods) {
        await db.insert(payments).values({
          schoolId,
          studentId: student.id,
          amount:    0,
          currency:  'EUR',
          method:    'other',
          category:  'tuition',
          period:    period as 'trimester_1' | 'trimester_2' | 'trimester_3',
          status:    'verified',
        })
      }
    }

    return student
  },

  async update(schoolId: string, studentId: string, data: UpdateStudentInput): Promise<Student> {
    const {
      parentPhone, parentName1, parentName2, email1, email2,
      emergencyPhone, enrollmentYear,
      classIdsToAdd, classIdsToRemove, paymentUpdates,
      ...studentData
    } = data

    // Update student fields
    const [updated] = await db
      .update(students)
      .set({ ...studentData, enrollmentYear: enrollmentYear ?? undefined, updatedAt: new Date() })
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .returning()

    // Update guardian (father)
    if (parentPhone !== undefined || parentName1 !== undefined || email1 !== undefined || emergencyPhone !== undefined) {
      const existingGuardians = await db.select().from(guardians).where(eq(guardians.studentId, studentId))
      const father = existingGuardians.find(g => g.relationship === 'father' || g.isPrimary) ?? null
      const patch: Record<string, unknown> = { updatedAt: new Date() }
      if (parentName1   !== undefined) patch.firstName      = parentName1   || 'Parent'
      if (parentPhone   !== undefined) patch.phone          = parentPhone.trim() || null
      if (email1        !== undefined) patch.email          = email1        || null
      if (emergencyPhone !== undefined) patch.emergencyPhone = emergencyPhone || null

      if (father) {
        await db.update(guardians).set(patch).where(eq(guardians.id, father.id))
      } else {
        await db.insert(guardians).values({
          schoolId, studentId,
          relationship: 'father', firstName: parentName1 || 'Parent', lastName: '',
          isPrimary: true,
          phone: parentPhone?.trim() || null,
          email: email1 || null,
          emergencyPhone: emergencyPhone || null,
        })
      }

      // Update mother
      if (parentName2 !== undefined || email2 !== undefined) {
        const mother = existingGuardians.find(g => g.relationship === 'mother') ?? null
        const mPatch: Record<string, unknown> = { updatedAt: new Date() }
        if (parentName2 !== undefined) mPatch.firstName = parentName2 || ''
        if (email2 !== undefined) mPatch.email = email2 || null
        if (mother) {
          await db.update(guardians).set(mPatch).where(eq(guardians.id, mother.id))
        } else if (parentName2) {
          await db.insert(guardians).values({
            schoolId, studentId, relationship: 'mother',
            firstName: parentName2, lastName: '', isPrimary: false, email: email2 || null,
          })
        }
      }
    }

    // Add new class enrollments
    if (classIdsToAdd?.length) {
      for (const classId of classIdsToAdd) {
        await db.insert(classEnrollments)
          .values({ schoolId, studentId, classId })
          .onConflictDoNothing()
      }
    }

    // Soft-delete removed class enrollments
    if (classIdsToRemove?.length) {
      await db
        .update(classEnrollments)
        .set({ unenrolledAt: new Date() })
        .where(and(
          eq(classEnrollments.studentId, studentId),
          inArray(classEnrollments.classId, classIdsToRemove),
          isNull(classEnrollments.unenrolledAt),
        ))
    }

    // Apply payment updates per class
    if (paymentUpdates?.length) {
      for (const { t1, t2, t3 } of paymentUpdates) {
        await this._syncPayments(schoolId, studentId, { t1, t2, t3 })
      }
    }

    return updated
  },

  async _syncPayments(
    schoolId: string, studentId: string,
    desired: { t1: boolean; t2: boolean; t3: boolean }
  ): Promise<void> {
    const existing = await db
      .select({ period: payments.period })
      .from(payments)
      .where(and(
        eq(payments.schoolId, schoolId),
        eq(payments.studentId, studentId),
        eq(payments.status, 'verified'),
      ))

    const existingPeriods = new Set(existing.map(r => r.period))

    const map: Array<[boolean, 'trimester_1' | 'trimester_2' | 'trimester_3']> = [
      [desired.t1, 'trimester_1'],
      [desired.t2, 'trimester_2'],
      [desired.t3, 'trimester_3'],
    ]

    for (const [shouldBePaid, period] of map) {
      const isPaid = existingPeriods.has(period) || existingPeriods.has('annually')
      if (shouldBePaid && !isPaid) {
        await db.insert(payments).values({
          schoolId, studentId, period, status: 'verified',
          amount: 0, currency: 'EUR', method: 'other', category: 'tuition',
        })
      } else if (!shouldBePaid && existingPeriods.has(period)) {
        // We only delete trimester-specific records, not annual
        await db.delete(payments).where(and(
          eq(payments.schoolId, schoolId),
          eq(payments.studentId, studentId),
          eq(payments.period, period),
          eq(payments.status, 'verified'),
        ))
      }
    }
  },

  async updateNote(schoolId: string, studentId: string, note: string): Promise<void> {
    await db
      .update(students)
      .set({ notes: note || null, updatedAt: new Date() })
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
  },

  // ── Modals data ──────────────────────────────────────────────────────────────

  async getStudentPayments(schoolId: string, studentId: string): Promise<StudentPayment[]> {
    const rows = await db
      .select({
        id:         payments.id,
        date:       payments.paymentDate,
        amount:     payments.amount,
        currency:   payments.currency,
        period:     payments.period,
        method:     payments.method,
        status:     payments.status,
        notes:      payments.notes,
        guardianFn: guardians.firstName,
        guardianLn: guardians.lastName,
      })
      .from(payments)
      .leftJoin(guardians, and(
        eq(guardians.studentId, payments.studentId!),
        eq(guardians.isPrimary, true),
      ))
      .where(and(eq(payments.schoolId, schoolId), eq(payments.studentId, studentId)))
      .orderBy(desc(payments.createdAt))

    return rows.map(r => ({
      id:         r.id,
      date:       r.date,
      academicYear: null,
      amountCents: r.amount,
      currency:   r.currency,
      period:     r.period,
      method:     r.method,
      status:     r.status,
      parentName: r.guardianLn || r.guardianFn || null,
      notes:      r.notes,
    }))
  },

  async getStudentAttendanceCalendar(
    schoolId: string, studentId: string
  ): Promise<StudentAttendanceDay[]> {
    const rows = await db
      .select({
        date:   attendance.date,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .innerJoin(attendance, eq(attendance.id, attendanceRecords.attendanceId))
      .where(and(
        eq(attendance.schoolId, schoolId),
        eq(attendanceRecords.studentId, studentId),
      ))
      .orderBy(attendance.date)

    return rows.map(r => ({
      date:   r.date,
      status: r.status as StudentAttendanceDay['status'],
    }))
  },

  async getStudentHomework(schoolId: string, studentId: string): Promise<StudentHomeworkItem[]> {
    const enrollmentRows = await db
      .select({ classId: classEnrollments.classId })
      .from(classEnrollments)
      .where(and(eq(classEnrollments.studentId, studentId), isNull(classEnrollments.unenrolledAt)))

    if (enrollmentRows.length === 0) return []
    const classIds = enrollmentRows.map(e => e.classId)

    const rows = await db
      .select({
        id:          homework.id,
        date:        homework.assignedDate,
        classCode:   classCatalog.code,
        className:   classes.name,
        title:       homework.title,
        surahName:   homework.surahName,
        surahArabic: homework.surahArabic,
        stars:       homeworkGrades.stars,
      })
      .from(homework)
      .innerJoin(classes, eq(classes.id, homework.classId))
      .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
      .leftJoin(homeworkGrades, and(
        eq(homeworkGrades.homeworkId, homework.id),
        eq(homeworkGrades.studentId, studentId),
      ))
      .where(and(eq(homework.schoolId, schoolId), inArray(homework.classId, classIds)))
      .orderBy(desc(homework.assignedDate))

    return rows.map(r => ({
      id:          r.id,
      date:        r.date,
      classCode:   r.classCode ?? '',
      className:   r.className,
      title:       r.title,
      surahName:   r.surahName,
      surahArabic: r.surahArabic,
      starsCount:  r.stars ?? null,
    }))
  },

  // ── Utilities ──────────────────────────────────────────────────────────────

  buildYearOptions,

  async getActiveClasses(schoolId: string, excludeClassIds: string[] = []) {
    const rows = await db
      .select({
        id:          classes.id,
        classCode:   classCatalog.code,
        name:        classes.name,
        teacherName: profiles.fullName,
        section:     classes.section,
      })
      .from(classes)
      .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
      .leftJoin(schoolMembers, eq(schoolMembers.id, classes.teacherId))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true)))

    return rows.filter(r => !excludeClassIds.includes(r.id)).map(r => ({
      id:          r.id,
      classCode:   r.classCode ?? '',
      name:        r.name,
      teacherName: r.teacherName ?? null,
    }))
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

  async getStudentReportCard(
    schoolId: string,
    studentId: string,
  ): Promise<StudentReportCardData> {
    const [
      schoolRow,
      examRows,
      starsRow,
      submissionCountRow,
    ] = await Promise.all([
      // School name
      db.select({ name: schools.name })
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1),

      // Exam results with class info
      db
        .select({
          id:             examResults.id,
          classCode:      classCatalog.code,
          className:      classes.name,
          teacherName:    profiles.fullName,
          trimester:      examResults.trimester,
          academicYear:   examResults.academicYear,
          score:          examResults.score,
          eagerness:      examResults.eagerness,
          participation:  examResults.participation,
          respectTeachers: examResults.respectTeachers,
          respectOthers:  examResults.respectOthers,
          attendance:     examResults.attendance,
          bringBooks:     examResults.bringBooks,
          coveredContent: examResults.coveredContent,
          generalComments: examResults.generalComments,
          parentSignature: examResults.parentSignature,
        })
        .from(examResults)
        .innerJoin(classes, eq(classes.id, examResults.classId))
        .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
        .leftJoin(schoolMembers, eq(schoolMembers.id, classes.teacherId))
        .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
        .where(and(
          eq(examResults.schoolId, schoolId),
          eq(examResults.studentId, studentId),
        ))
        .orderBy(examResults.trimester),

      // Total stars
      db
        .select({ total: sum(homeworkGrades.stars) })
        .from(homeworkGrades)
        .where(and(
          eq(homeworkGrades.schoolId, schoolId),
          eq(homeworkGrades.studentId, studentId),
        )),

      // Graded submissions count
      db
        .select({ cnt: count() })
        .from(homeworkGrades)
        .where(and(
          eq(homeworkGrades.schoolId, schoolId),
          eq(homeworkGrades.studentId, studentId),
        )),
    ])

    return {
      schoolName:        schoolRow[0]?.name ?? '',
      totalStars:        Number(starsRow[0]?.total ?? 0),
      gradedSubmissions: Number(submissionCountRow[0]?.cnt ?? 0),
      examResults:       examRows.map(r => ({
        id:              r.id,
        classCode:       r.classCode ?? '',
        className:       r.className,
        teacherName:     r.teacherName ?? null,
        trimester:       r.trimester,
        academicYear:    r.academicYear,
        score:           r.score,
        eagerness:       r.eagerness,
        participation:   r.participation,
        respectTeachers: r.respectTeachers,
        respectOthers:   r.respectOthers,
        attendance:      r.attendance,
        bringBooks:      r.bringBooks,
        coveredContent:  r.coveredContent,
        generalComments: r.generalComments,
        parentSignature: r.parentSignature,
      })) as StudentExamResult[],
    }
  },
}
