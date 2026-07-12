import { db } from '@/db'
import {
  homework, homeworkSubmissions, teacherHomeworkClasses, virtualSessions,
  classes, classCatalog, schoolMembers, profiles,
  classEnrollments, students, parentStudents,
} from '@/db/schema'
import { eq, and, sql, or, notInArray, desc, inArray, isNull, asc } from 'drizzle-orm'
import type { HomeworkItem, PinnedClass, ClassOption, VirtualSession, HomeworkStudent, ParentChild, ParentHomeworkItem, AdminClassHomework, AdminHomeworkOverview } from './homework.types'
import type { CreateHomeworkInput, UpdateHomeworkInput } from './homework.schema'
import { nanoid } from 'nanoid'

function buildTitle(input: { hasNewSurah?: boolean; surahName?: string; surahArabic?: string; isFullSurah?: boolean; fromVerse?: number; toVerse?: number; hasRevision?: boolean; revisionSurahs?: { name: string }[] }): string {
  const parts: string[] = []
  if (input.hasNewSurah && input.surahName) {
    if (input.isFullSurah) {
      parts.push(`Your homework is the full Surah: ${input.surahName} - ${input.surahArabic ?? ''}`)
    } else {
      parts.push(`Your homework is Surah: ${input.surahName} - ${input.surahArabic ?? ''} (V. ${input.fromVerse}-${input.toVerse})`)
    }
  }
  if (input.hasRevision && input.revisionSurahs?.length) {
    parts.push(`Revision: ${input.revisionSurahs.map(s => s.name).join(', ')}`)
  }
  return parts.join(' + ') || 'Homework'
}

export const homeworkService = {
  // ── Pinned classes ──────────────────────────────────────────────
  async getPinnedClasses(schoolId: string, memberId: string): Promise<PinnedClass[]> {
    const rows = await db
      .select({
        pinnedId:    teacherHomeworkClasses.id,
        classId:     classes.id,
        catalogCode: classCatalog.code,
        subjectCode: classCatalog.subjectCode,
        name:        classes.name,
        section:     classes.section,
        teacherName: profiles.fullName,
        homeworkCount: sql<number>`(
          SELECT count(*) FROM homework h WHERE h.class_id = ${classes.id} AND h.school_id = ${schoolId}
        )::int`,
      })
      .from(teacherHomeworkClasses)
      .innerJoin(classes, eq(classes.id, teacherHomeworkClasses.classId))
      .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
      .leftJoin(schoolMembers, eq(schoolMembers.id, classes.teacherId))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(
        and(
          eq(teacherHomeworkClasses.schoolMemberId, memberId),
          eq(teacherHomeworkClasses.schoolId, schoolId),
        )
      )

    return rows.map(r => ({
      ...r,
      catalogCode: r.catalogCode ?? '',
      subjectCode: r.subjectCode ?? '',
      teacherName: r.teacherName ?? null,
      homeworkCount: r.homeworkCount ?? 0,
    }))
  },

  async addPinnedClass(schoolId: string, memberId: string, classId: string): Promise<void> {
    await db
      .insert(teacherHomeworkClasses)
      .values({ schoolId, schoolMemberId: memberId, classId })
      .onConflictDoNothing()
  },

  async removePinnedClass(pinnedId: string): Promise<void> {
    await db
      .delete(teacherHomeworkClasses)
      .where(eq(teacherHomeworkClasses.id, pinnedId))
  },

  // ── Class options (for AddClassDialog) ──────────────────────────
  async getClassOptions(schoolId: string, memberId: string, excludeClassIds: string[] = []): Promise<ClassOption[]> {
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

  // ── Homework CRUD ────────────────────────────────────────────────
  async getByClass(schoolId: string, classId: string): Promise<HomeworkItem[]> {
    const rows = await db
      .select({
        id:           homework.id,
        schoolId:     homework.schoolId,
        classId:      homework.classId,
        title:        homework.title,
        description:  homework.description,
        assignedDate: homework.assignedDate,
        surahName:    homework.surahName,
        surahArabic:  homework.surahArabic,
        fromVerse:    homework.fromVerse,
        toVerse:      homework.toVerse,
        isFullSurah:  homework.isFullSurah,
        revisionSurahs: homework.revisionSurahs,
        fileUrl:      homework.fileUrl,
        fileName:     homework.fileName,
        fileSize:     homework.fileSize,
        createdBy:    homework.createdBy,
        createdByName: profiles.fullName,
        createdAt:    homework.createdAt,
      })
      .from(homework)
      .leftJoin(schoolMembers, eq(schoolMembers.id, homework.createdBy))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(and(eq(homework.schoolId, schoolId), eq(homework.classId, classId)))
      .orderBy(desc(homework.createdAt))

    return rows.map(r => ({
      ...r,
      isFullSurah: r.isFullSurah ?? false,
      revisionSurahs: (r.revisionSurahs as any[]) ?? [],
      createdByName: r.createdByName ?? null,
    }))
  },

  async create(
    schoolId: string,
    memberId: string,
    input: CreateHomeworkInput,
  ): Promise<HomeworkItem> {
    const title = buildTitle(input)
    const today = new Date().toISOString().split('T')[0]

    const [row] = await db
      .insert(homework)
      .values({
        schoolId,
        classId:      input.classId,
        title,
        description:  input.description ?? null,
        assignedDate: today,
        surahName:    input.hasNewSurah ? (input.surahName ?? null) : null,
        surahArabic:  input.hasNewSurah ? (input.surahArabic ?? null) : null,
        fromVerse:    input.hasNewSurah ? (input.fromVerse ?? null) : null,
        toVerse:      input.hasNewSurah ? (input.toVerse ?? null) : null,
        isFullSurah:  input.hasNewSurah ? input.isFullSurah : false,
        revisionSurahs: input.hasRevision ? input.revisionSurahs : [],
        fileUrl:      input.fileUrl ?? null,
        fileName:     input.fileName ?? null,
        fileSize:     input.fileSize ?? null,
        createdBy:    memberId,
      })
      .returning()

    return {
      ...row,
      assignedDate: row.assignedDate as string,
      isFullSurah: row.isFullSurah ?? false,
      revisionSurahs: (row.revisionSurahs as any[]) ?? [],
      createdByName: null,
    }
  },

  async update(homeworkId: string, schoolId: string, input: UpdateHomeworkInput): Promise<void> {
    const title = buildTitle({ ...input, hasNewSurah: input.hasNewSurah ?? false, hasRevision: input.hasRevision ?? false })

    await db
      .update(homework)
      .set({
        title,
        description:  input.description ?? null,
        surahName:    input.hasNewSurah ? (input.surahName ?? null) : null,
        surahArabic:  input.hasNewSurah ? (input.surahArabic ?? null) : null,
        fromVerse:    input.hasNewSurah ? (input.fromVerse ?? null) : null,
        toVerse:      input.hasNewSurah ? (input.toVerse ?? null) : null,
        isFullSurah:  input.hasNewSurah ? (input.isFullSurah ?? false) : false,
        revisionSurahs: input.hasRevision ? (input.revisionSurahs ?? []) : [],
        fileUrl:      input.fileUrl ?? null,
        fileName:     input.fileName ?? null,
        fileSize:     input.fileSize ?? null,
      })
      .where(and(eq(homework.id, homeworkId), eq(homework.schoolId, schoolId)))
  },

  async delete(homeworkId: string, schoolId: string): Promise<void> {
    await db
      .delete(homework)
      .where(and(eq(homework.id, homeworkId), eq(homework.schoolId, schoolId)))
  },

  // ── Students (Grade dialog) ──────────────────────────────────────
  async getStudentsByClass(schoolId: string, classId: string): Promise<HomeworkStudent[]> {
    const rows = await db
      .select({
        studentId: students.id,
        firstName: students.firstName,
        lastName:  students.lastName,
      })
      .from(classEnrollments)
      .innerJoin(students, eq(students.id, classEnrollments.studentId))
      .where(
        and(
          eq(classEnrollments.classId, classId),
          eq(classEnrollments.schoolId, schoolId),
        )
      )

    return rows.map(r => ({ ...r, status: 'pending' as const }))
  },

  // ── Virtual sessions ─────────────────────────────────────────────
  async getActiveSession(schoolId: string, classId: string): Promise<VirtualSession | null> {
    const [row] = await db
      .select({
        id:         virtualSessions.id,
        classId:    virtualSessions.classId,
        jitsiRoom:  virtualSessions.jitsiRoom,
        isActive:   virtualSessions.isActive,
        createdByName: profiles.fullName,
        createdAt:  virtualSessions.createdAt,
      })
      .from(virtualSessions)
      .leftJoin(schoolMembers, eq(schoolMembers.id, virtualSessions.createdBy))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(
        and(
          eq(virtualSessions.schoolId, schoolId),
          eq(virtualSessions.classId, classId),
          eq(virtualSessions.isActive, true),
        )
      )
      .limit(1)

    if (!row) return null
    return { ...row, createdByName: row.createdByName ?? null }
  },

  async createVirtualSession(schoolId: string, classId: string, memberId: string): Promise<VirtualSession> {
    const jitsiRoom = `qaf-${nanoid(32).toLowerCase()}`

    const [row] = await db
      .insert(virtualSessions)
      .values({ schoolId, classId, createdBy: memberId, jitsiRoom, isActive: true })
      .returning()

    return {
      id:           row.id,
      classId:      row.classId,
      jitsiRoom:    row.jitsiRoom,
      isActive:     row.isActive,
      createdByName: null,
      createdAt:    row.createdAt,
    }
  },

  async endVirtualSession(sessionId: string, schoolId: string): Promise<void> {
    await db
      .update(virtualSessions)
      .set({ isActive: false, endedAt: new Date() })
      .where(and(eq(virtualSessions.id, sessionId), eq(virtualSessions.schoolId, schoolId)))
  },

  // ── Parent portal ────────────────────────────────────────────────
  async getForParent(
    schoolId: string,
    memberId: string,
  ): Promise<{ children: ParentChild[]; homeworkItems: ParentHomeworkItem[] }> {
    const childRows = await db
      .select({
        studentId: parentStudents.studentId,
        firstName: students.firstName,
        lastName:  students.lastName,
      })
      .from(parentStudents)
      .innerJoin(students, eq(students.id, parentStudents.studentId))
      .where(and(eq(parentStudents.schoolMemberId, memberId), eq(parentStudents.schoolId, schoolId)))
      .orderBy(asc(students.firstName))

    if (childRows.length === 0) return { children: [], homeworkItems: [] }

    const studentIds = childRows.map(r => r.studentId)

    const enrollmentRows = await db
      .select({ classId: classEnrollments.classId, studentId: classEnrollments.studentId })
      .from(classEnrollments)
      .where(
        and(
          eq(classEnrollments.schoolId, schoolId),
          inArray(classEnrollments.studentId, studentIds),
          isNull(classEnrollments.unenrolledAt),
        )
      )

    if (enrollmentRows.length === 0) {
      return {
        children: childRows.map(r => ({ studentId: r.studentId, firstName: r.firstName, lastName: r.lastName })),
        homeworkItems: [],
      }
    }

    const classIds = [...new Set(enrollmentRows.map(r => r.classId))]
    const studentByClass = new Map<string, string[]>()
    for (const e of enrollmentRows) {
      const arr = studentByClass.get(e.classId) ?? []
      arr.push(e.studentId)
      studentByClass.set(e.classId, arr)
    }

    const hwRows = await db
      .select({
        id:           homework.id,
        schoolId:     homework.schoolId,
        classId:      homework.classId,
        className:    classes.name,
        classCode:    classCatalog.code,
        classSection: classes.section,
        subjectCode:  classCatalog.subjectCode,
        assignedDate: homework.assignedDate,
        surahName:    homework.surahName,
        surahArabic:  homework.surahArabic,
        fromVerse:    homework.fromVerse,
        toVerse:      homework.toVerse,
        isFullSurah:  homework.isFullSurah,
        revisionSurahs: homework.revisionSurahs,
        description:  homework.description,
        fileUrl:      homework.fileUrl,
        fileName:     homework.fileName,
        fileSize:     homework.fileSize,
        teacherName:  profiles.fullName,
        createdAt:    homework.createdAt,
      })
      .from(homework)
      .leftJoin(classes, eq(classes.id, homework.classId))
      .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
      .leftJoin(schoolMembers, eq(schoolMembers.id, homework.createdBy))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(and(eq(homework.schoolId, schoolId), inArray(homework.classId, classIds)))
      .orderBy(desc(homework.assignedDate), desc(homework.createdAt))

    if (hwRows.length === 0) {
      return {
        children: childRows.map(r => ({ studentId: r.studentId, firstName: r.firstName, lastName: r.lastName })),
        homeworkItems: [],
      }
    }

    const hwIds = hwRows.map(r => r.id)
    const submissionRows = await db
      .select({
        homeworkId:   homeworkSubmissions.homeworkId,
        studentId:    homeworkSubmissions.studentId,
        recordingUrl: homeworkSubmissions.recordingUrl,
      })
      .from(homeworkSubmissions)
      .where(
        and(
          inArray(homeworkSubmissions.homeworkId, hwIds),
          inArray(homeworkSubmissions.studentId, studentIds),
        )
      )

    const submissionMap = new Map<string, string>()
    for (const s of submissionRows) {
      submissionMap.set(`${s.homeworkId}:${s.studentId}`, s.recordingUrl)
    }

    // Compute latest homework id per class (first in desc-ordered list)
    const latestByClass = new Map<string, string>()
    for (const row of hwRows) {
      if (!latestByClass.has(row.classId)) latestByClass.set(row.classId, row.id)
    }

    // Expand: one item per (homework, student) for students enrolled in that class
    const homeworkItems: ParentHomeworkItem[] = []
    for (const row of hwRows) {
      const enrolledStudents = studentByClass.get(row.classId) ?? []
      for (const studentId of enrolledStudents) {
        homeworkItems.push({
          id:           row.id,
          schoolId:     row.schoolId,
          classId:      row.classId,
          className:    row.className ?? '',
          classCode:    row.classCode ?? '',
          classSection: row.classSection ?? null,
          subjectCode:  row.subjectCode ?? '',
          assignedDate: row.assignedDate as string,
          surahName:    row.surahName ?? null,
          surahArabic:  row.surahArabic ?? null,
          fromVerse:    row.fromVerse ?? null,
          toVerse:      row.toVerse ?? null,
          isFullSurah:  row.isFullSurah ?? false,
          revisionSurahs: (row.revisionSurahs as any[]) ?? [],
          description:  row.description ?? null,
          fileUrl:      row.fileUrl ?? null,
          fileName:     row.fileName ?? null,
          fileSize:     row.fileSize ?? null,
          teacherName:  row.teacherName ?? null,
          isLatest:     latestByClass.get(row.classId) === row.id,
          submissionUrl: submissionMap.get(`${row.id}:${studentId}`) ?? null,
          studentId,
        })
      }
    }

    return {
      children: childRows.map(r => ({ studentId: r.studentId, firstName: r.firstName, lastName: r.lastName })),
      homeworkItems,
    }
  },

  // ── Admin overview ───────────────────────────────────────────────
  async getAdminOverview(schoolId: string, date: string): Promise<AdminHomeworkOverview> {
    const classRows = await db
      .select({
        classId:     classes.id,
        className:   classes.name,
        classCode:   classCatalog.code,
        subjectCode: classCatalog.subjectCode,
        section:     classes.section,
        room:        classes.room,
        teacherId:   classes.teacherId,
        teacherName: profiles.fullName,
      })
      .from(classes)
      .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
      .leftJoin(schoolMembers, eq(schoolMembers.id, classes.teacherId))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true)))
      .orderBy(classes.room, classes.name)

    if (classRows.length === 0) {
      return { date, classes: [], stats: { submitted: 0, missing: 0, total: 0, teachersSubmitted: 0, teachersTotal: 0 } }
    }

    const classIds = classRows.map(r => r.classId)

    const hwRows = await db
      .select({
        id:            homework.id,
        classId:       homework.classId,
        surahName:     homework.surahName,
        surahArabic:   homework.surahArabic,
        isFullSurah:   homework.isFullSurah,
        fromVerse:     homework.fromVerse,
        toVerse:       homework.toVerse,
        revisionSurahs: homework.revisionSurahs,
        description:   homework.description,
        fileUrl:       homework.fileUrl,
        fileName:      homework.fileName,
        fileSize:      homework.fileSize,
        assignedDate:  homework.assignedDate,
        createdById:   homework.createdBy,
        createdByName: profiles.fullName,
        createdAt:     homework.createdAt,
      })
      .from(homework)
      .leftJoin(schoolMembers, eq(schoolMembers.id, homework.createdBy))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(and(
        eq(homework.schoolId, schoolId),
        inArray(homework.classId, classIds),
        eq(homework.assignedDate, date),
      ))
      .orderBy(desc(homework.createdAt))

    const hwByClass = new Map<string, typeof hwRows[0]>()
    for (const hw of hwRows) {
      if (!hwByClass.has(hw.classId)) hwByClass.set(hw.classId, hw)
    }

    const result: AdminClassHomework[] = classRows.map(c => {
      const hw = hwByClass.get(c.classId) ?? null
      return {
        classId:     c.classId,
        className:   c.className,
        classCode:   c.classCode ?? '',
        subjectCode: c.subjectCode ?? '',
        section:     c.section ?? null,
        room:        c.room ?? null,
        teacherName: c.teacherName ?? null,
        homework: hw ? {
          id:            hw.id,
          surahName:     hw.surahName ?? null,
          surahArabic:   hw.surahArabic ?? null,
          isFullSurah:   hw.isFullSurah ?? false,
          fromVerse:     hw.fromVerse ?? null,
          toVerse:       hw.toVerse ?? null,
          revisionSurahs: (hw.revisionSurahs as { name: string; arabic: string }[]) ?? [],
          description:   hw.description ?? null,
          fileUrl:       hw.fileUrl ?? null,
          fileName:      hw.fileName ?? null,
          fileSize:      hw.fileSize ?? null,
          assignedDate:  hw.assignedDate as string,
          createdByName: hw.createdByName ?? null,
        } : null,
        status: hw ? 'submitted' : 'missing',
      }
    })

    const submitted = result.filter(c => c.status === 'submitted').length
    const missing   = result.filter(c => c.status === 'missing').length

    const allTeacherIds = new Set(
      classRows.map(c => c.teacherId).filter((id): id is string => id !== null)
    )
    const submittedTeacherIds = new Set(
      hwRows.map(hw => hw.createdById).filter((id): id is string => id !== null)
    )

    return {
      date,
      classes: result,
      stats: {
        submitted,
        missing,
        total: result.length,
        teachersSubmitted: submittedTeacherIds.size,
        teachersTotal:     allTeacherIds.size,
      },
    }
  },

  async submitRecording(
    schoolId: string,
    homeworkId: string,
    studentId: string,
    recordingUrl: string,
    durationSeconds: number | null,
  ): Promise<void> {
    await db
      .insert(homeworkSubmissions)
      .values({ schoolId, homeworkId, studentId, recordingUrl, durationSeconds })
      .onConflictDoUpdate({
        target: [homeworkSubmissions.homeworkId, homeworkSubmissions.studentId],
        set: { recordingUrl, durationSeconds, submittedAt: new Date() },
      })
  },
}
