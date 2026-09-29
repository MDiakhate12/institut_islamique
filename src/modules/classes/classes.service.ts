import { db } from '@/db'
import { classes, classEnrollments, students, schoolMembers, profiles } from '@/db/schema'
import { eq, and, asc, isNull, inArray, sql } from 'drizzle-orm'
import type { CreateClassInput, UpdateClassInput } from './classes.schema'
import type { ClassWithDetails, EnrolledStudentInClass } from './classes.types'
import type { Student } from '@/modules/students/students.types'

// ── Scheduled classes service ─────────────────────────────────────────────────

export const scheduledClassesService = {
  async getBySchool(schoolId: string): Promise<ClassWithDetails[]> {
    const rows = await db
      .select({
        id:                 classes.id,
        schoolId:           classes.schoolId,
        teacherId:          classes.teacherId,
        assistantTeacherId: classes.assistantTeacherId,
        subject:            classes.subject,
        name:               classes.name,
        room:               classes.room,
        curriculum:         classes.curriculum,
        academicYear:       classes.academicYear,
        isActive:           classes.isActive,
        examPeriodT1Open:   classes.examPeriodT1Open,
        examPeriodT2Open:   classes.examPeriodT2Open,
        examPeriodT3Open:   classes.examPeriodT3Open,
        createdAt:          classes.createdAt,
        updatedAt:          classes.updatedAt,
      })
      .from(classes)
      .where(eq(classes.schoolId, schoolId))
      .orderBy(asc(classes.subject), asc(classes.name))

    if (rows.length === 0) return []

    // 2. Teacher names (teacher + assistant)
    const allTeacherIds = [...new Set(
      [
        ...rows.map(r => r.teacherId),
        ...rows.map(r => r.assistantTeacherId),
      ].filter((id): id is string => id !== null)
    )]

    let teacherNameMap = new Map<string, string>()
    if (allTeacherIds.length > 0) {
      const teacherData = await db
        .select({ memberId: schoolMembers.id, fullName: profiles.fullName })
        .from(schoolMembers)
        .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
        .where(inArray(schoolMembers.id, allTeacherIds))
      teacherNameMap = new Map(teacherData.map(t => [t.memberId, t.fullName ?? '']))
    }

    // 3. Enrollment counts
    const classIds = rows.map(r => r.id)
    const counts = await db
      .select({
        classId: classEnrollments.classId,
        count: sql<number>`count(*)::int`,
      })
      .from(classEnrollments)
      .where(and(
        inArray(classEnrollments.classId, classIds),
        isNull(classEnrollments.unenrolledAt)
      ))
      .groupBy(classEnrollments.classId)

    const countMap = new Map(counts.map(c => [c.classId, c.count]))

    return rows.map(r => ({
      ...r,
      teacherName: r.teacherId ? (teacherNameMap.get(r.teacherId) ?? null) : null,
      assistantTeacherName: r.assistantTeacherId ? (teacherNameMap.get(r.assistantTeacherId) ?? null) : null,
      enrollmentCount: countMap.get(r.id) ?? 0,
      fullCode: r.subject,
      subjectCode: r.subject,
    }))
  },

  async getById(schoolId: string, classId: string): Promise<ClassWithDetails | null> {
    const all = await this.getBySchool(schoolId)
    return all.find(c => c.id === classId) ?? null
  },

  async create(schoolId: string, data: CreateClassInput): Promise<string> {
    const [row] = await db
      .insert(classes)
      .values({
        schoolId,
        subject:            data.subject,
        teacherId:          data.teacherId          ?? null,
        assistantTeacherId: data.assistantTeacherId ?? null,
        name:               data.name.trim(),
        room:               data.room      || null,
        curriculum:         data.curriculum || null,
        academicYear:       data.academicYear,
      })
      .returning({ id: classes.id })

    return row.id
  },

  async update(schoolId: string, classId: string, data: UpdateClassInput): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = { updatedAt: new Date() }

    if (data.subject            !== undefined) updateData.subject            = data.subject
    if (data.name               !== undefined) updateData.name               = data.name.trim()
    if (data.curriculum         !== undefined) updateData.curriculum         = data.curriculum         || null
    if (data.room               !== undefined) updateData.room               = data.room               || null
    if (data.teacherId          !== undefined) updateData.teacherId          = data.teacherId          ?? null
    if (data.assistantTeacherId !== undefined) updateData.assistantTeacherId = data.assistantTeacherId ?? null
    if (data.academicYear       !== undefined) updateData.academicYear       = data.academicYear

    await db
      .update(classes)
      .set(updateData)
      .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)))
  },

  async delete(schoolId: string, classId: string): Promise<void> {
    await db
      .delete(classes)
      .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)))
  },

  async getEnrollments(classId: string): Promise<EnrolledStudentInClass[]> {
    const rows = await db
      .select({
        enrollmentId:    classEnrollments.id,
        studentId:       students.id,
        firstName:       students.firstName,
        lastName:        students.lastName,
        studentCustomId: students.studentCustomId,
        enrolledAt:      classEnrollments.enrolledAt,
        unenrolledAt:    classEnrollments.unenrolledAt,
      })
      .from(classEnrollments)
      .innerJoin(students, eq(students.id, classEnrollments.studentId))
      .where(and(
        eq(classEnrollments.classId, classId),
        isNull(classEnrollments.unenrolledAt)
      ))
      .orderBy(asc(students.lastName), asc(students.firstName))

    return rows
  },

  async enrollStudent(schoolId: string, classId: string, studentId: string): Promise<void> {
    await db.insert(classEnrollments).values({ schoolId, classId, studentId })
  },

  async unenrollStudent(enrollmentId: string): Promise<void> {
    await db
      .update(classEnrollments)
      .set({ unenrolledAt: new Date() })
      .where(eq(classEnrollments.id, enrollmentId))
  },

  async transferStudent(enrollmentId: string, newClassId: string, schoolId: string): Promise<void> {
    const [enrollment] = await db
      .select()
      .from(classEnrollments)
      .where(eq(classEnrollments.id, enrollmentId))
      .limit(1)
    if (!enrollment) throw new Error('Inscription introuvable')

    await this.unenrollStudent(enrollmentId)
    await this.enrollStudent(schoolId, newClassId, enrollment.studentId)
  },

  async getAvailableStudents(schoolId: string, classId: string): Promise<Student[]> {
    // Currently enrolled in this class
    const enrolled = await db
      .select({ studentId: classEnrollments.studentId })
      .from(classEnrollments)
      .where(and(
        eq(classEnrollments.classId, classId),
        isNull(classEnrollments.unenrolledAt)
      ))

    const enrolledIds = new Set(enrolled.map(e => e.studentId))

    const allStudents = await db
      .select()
      .from(students)
      .where(eq(students.schoolId, schoolId))
      .orderBy(asc(students.lastName), asc(students.firstName))

    return allStudents.filter(s => !enrolledIds.has(s.id))
  },

  async getDistinctRooms(schoolId: string): Promise<string[]> {
    const rows = await db
      .selectDistinct({ room: classes.room })
      .from(classes)
      .where(eq(classes.schoolId, schoolId))
      .orderBy(asc(classes.room))
    return rows.map(r => r.room).filter((r): r is string => r !== null)
  },

  // Light fetch for the registration form class picker
  async getForRegistration(schoolId: string) {
    const rows = await db
      .select({
        id:      classes.id,
        name:    classes.name,
        subject: classes.subject,
        curriculum: classes.curriculum,
      })
      .from(classes)
      .where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true)))
      .orderBy(asc(classes.subject), asc(classes.name))

    return rows.map(r => ({
      id:          r.id,
      name:        r.name,
      code:        r.subject,
      fullCode:    r.subject,
      subjectCode: r.subject,
      curriculum:  r.curriculum ?? null,
    }))
  },
}
