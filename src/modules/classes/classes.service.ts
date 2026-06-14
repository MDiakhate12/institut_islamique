import { db } from '@/db'
import { classCatalog, classes, classEnrollments, students, schoolMembers, profiles } from '@/db/schema'
import { eq, and, asc, isNull, inArray, sql } from 'drizzle-orm'
import type {
  CreateCatalogClassInput, UpdateCatalogClassInput,
  CreateClassInput, UpdateClassInput,
} from './classes.schema'
import type {
  CatalogClass, CatalogClassWithNext,
  ClassWithDetails, EnrolledStudentInClass,
} from './classes.types'
import { buildFullCode } from './classes.types'
import type { Student } from '@/modules/students/students.types'

// ── Catalog service ───────────────────────────────────────────────────────────

export const catalogClassesService = {
  async getAll(): Promise<CatalogClassWithNext[]> {
    const rows = await db
      .select()
      .from(classCatalog)
      .orderBy(asc(classCatalog.subjectCode), asc(classCatalog.levelNumber))

    const byId = new Map(rows.map(r => [r.id, r]))

    // Build reverse map: nextClassId → id of the class that points to it as "next"
    const prevMap = new Map<string, string>()
    for (const r of rows) {
      if (r.nextClassId) prevMap.set(r.nextClassId, r.id)
    }

    return rows.map(r => {
      const prevId = prevMap.get(r.id) ?? null
      const prev   = prevId ? byId.get(prevId) : null
      return {
        ...r,
        nextClassName:     r.nextClassId ? (byId.get(r.nextClassId)?.name ?? null) : null,
        nextClassCode:     r.nextClassId ? (byId.get(r.nextClassId)?.code ?? null) : null,
        previousClassId:   prevId,
        previousClassName: prev?.name ?? null,
        previousClassCode: prev?.code ?? null,
      }
    })
  },

  async getById(id: string): Promise<CatalogClass | null> {
    const [row] = await db
      .select()
      .from(classCatalog)
      .where(eq(classCatalog.id, id))
      .limit(1)
    return row ?? null
  },

  async create(data: CreateCatalogClassInput): Promise<CatalogClass> {
    const code = data.levelNumber
      ? `${data.subjectCode}-${data.levelNumber}`
      : data.subjectCode

    const [row] = await db
      .insert(classCatalog)
      .values({
        code,
        subjectCode:  data.subjectCode,
        levelNumber:  data.levelNumber ?? null,
        name:         data.name,
        nextClassId:  data.nextClassId ?? null,
        curriculum:   data.curriculum  ?? null,
      })
      .returning()

    // If a previous class was selected, link it → new class by updating its nextClassId
    if (data.previousClassId) {
      await db
        .update(classCatalog)
        .set({ nextClassId: row.id, updatedAt: new Date() })
        .where(eq(classCatalog.id, data.previousClassId))
    }

    return row
  },

  async update(id: string, data: UpdateCatalogClassInput): Promise<CatalogClass> {
    const existing = await this.getById(id)
    const subjectCode = data.subjectCode ?? existing?.subjectCode ?? ''
    const levelNumber = data.levelNumber !== undefined ? data.levelNumber : existing?.levelNumber

    const code = levelNumber
      ? `${subjectCode}-${levelNumber}`
      : subjectCode

    const [row] = await db
      .update(classCatalog)
      .set({
        code,
        ...(data.subjectCode  !== undefined && { subjectCode: data.subjectCode }),
        ...(data.levelNumber  !== undefined && { levelNumber: data.levelNumber ?? null }),
        ...(data.name         !== undefined && { name: data.name }),
        ...(data.nextClassId  !== undefined && { nextClassId: data.nextClassId ?? null }),
        ...(data.curriculum   !== undefined && { curriculum: data.curriculum ?? null }),
        updatedAt: new Date(),
      })
      .where(eq(classCatalog.id, id))
      .returning()

    // Handle previous class link change
    if (data.previousClassId !== undefined) {
      // Find which class currently points to this one (current previous)
      const currentAll = await db.select({ id: classCatalog.id, nextClassId: classCatalog.nextClassId }).from(classCatalog)
      const currentPrev = currentAll.find(r => r.nextClassId === id)

      if (currentPrev && currentPrev.id !== data.previousClassId) {
        // Old previous class no longer leads here — clear its nextClassId
        await db
          .update(classCatalog)
          .set({ nextClassId: null, updatedAt: new Date() })
          .where(eq(classCatalog.id, currentPrev.id))
      }

      if (data.previousClassId) {
        // New previous class now leads to this one
        await db
          .update(classCatalog)
          .set({ nextClassId: id, updatedAt: new Date() })
          .where(eq(classCatalog.id, data.previousClassId))
      }
    }

    return row
  },

  async delete(id: string): Promise<void> {
    await db.delete(classCatalog).where(eq(classCatalog.id, id))
  },
}

// ── Scheduled classes service ─────────────────────────────────────────────────

export const scheduledClassesService = {
  async getBySchool(schoolId: string): Promise<ClassWithDetails[]> {
    // 1. Classes joined with catalog
    const rows = await db
      .select({
        id:                 classes.id,
        schoolId:           classes.schoolId,
        catalogClassId:     classes.catalogClassId,
        teacherId:          classes.teacherId,
        assistantTeacherId: classes.assistantTeacherId,
        name:               classes.name,
        room:               classes.room,
        section:            classes.section,
        academicYear:       classes.academicYear,
        isActive:           classes.isActive,
        examPeriodT1Open:   classes.examPeriodT1Open,
        examPeriodT2Open:   classes.examPeriodT2Open,
        examPeriodT3Open:   classes.examPeriodT3Open,
        createdAt:          classes.createdAt,
        updatedAt:          classes.updatedAt,
        subjectCode:        classCatalog.subjectCode,
        levelNumber:        classCatalog.levelNumber,
        catalogCode:        classCatalog.code,
        curriculum:         classCatalog.curriculum,
      })
      .from(classes)
      .leftJoin(classCatalog, eq(classes.catalogClassId, classCatalog.id))
      .where(eq(classes.schoolId, schoolId))
      .orderBy(asc(classCatalog.subjectCode), asc(classCatalog.levelNumber), asc(classes.section))

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
      fullCode: buildFullCode(r.catalogCode, r.section),
    }))
  },

  async getById(schoolId: string, classId: string): Promise<ClassWithDetails | null> {
    const all = await this.getBySchool(schoolId)
    return all.find(c => c.id === classId) ?? null
  },

  async create(schoolId: string, data: CreateClassInput): Promise<string> {
    // Get name from catalog
    const [catalogRow] = await db
      .select({ name: classCatalog.name })
      .from(classCatalog)
      .where(eq(classCatalog.id, data.catalogClassId))
      .limit(1)

    const [row] = await db
      .insert(classes)
      .values({
        schoolId,
        catalogClassId:     data.catalogClassId,
        teacherId:          data.teacherId    ?? null,
        assistantTeacherId: data.assistantTeacherId ?? null,
        name:               catalogRow?.name ?? 'Classe',
        room:               data.room    || null,
        section:            data.section || null,
        academicYear:       data.academicYear,
      })
      .returning({ id: classes.id })

    return row.id
  },

  async update(schoolId: string, classId: string, data: UpdateClassInput): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = { updatedAt: new Date() }

    if (data.catalogClassId !== undefined) {
      updateData.catalogClassId = data.catalogClassId
      if (data.catalogClassId) {
        const [catalogRow] = await db
          .select({ name: classCatalog.name })
          .from(classCatalog)
          .where(eq(classCatalog.id, data.catalogClassId))
          .limit(1)
        if (catalogRow) updateData.name = catalogRow.name
      }
    }
    if (data.section            !== undefined) updateData.section            = data.section            || null
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
        parentPhone:     students.parentPhone,
        studentCustomId: students.studentCustomId,
        paidT1:          classEnrollments.paidT1,
        paidT2:          classEnrollments.paidT2,
        paidT3:          classEnrollments.paidT3,
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
}
