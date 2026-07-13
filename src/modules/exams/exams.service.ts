import { db } from '@/db'
import {
  examResults, classes, classCatalog, classEnrollments,
  students, schoolMembers, profiles, parentStudents,
} from '@/db/schema'
import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import type {
  ExamResult, TeacherExamClass, StudentGradeStatus,
  AdminExamClassProgress, AdminExamStudentProgress,
  ParentChildExamData, ParentExamGrade, GradeFormStudent,
} from './exams.types'
import type { SubmitExamInput } from './exams.schema'

function computeAverageScore(row: typeof examResults.$inferSelect): number | null {
  const fields = [
    row.attendance,
    row.respectTeachers,
    row.respectOthers,
    row.participation,
    row.eagerness,
  ].filter((v): v is number => v !== null)
  if (fields.length === 0) return null
  return Math.round((fields.reduce((s, v) => s + v, 0) / (fields.length * 5)) * 100)
}

export const examsService = {
  // ── Teacher ─────────────────────────────────────────────────────────────────

  async getTeacherClasses(
    memberId: string,
    schoolId: string,
    trimester: number,
  ): Promise<TeacherExamClass[]> {
    const teacherClasses = await db
      .select({
        classId: classes.id,
        className: classes.name,
        room: classes.room,
        subjectCode: classCatalog.subjectCode,
        catalogCode: classCatalog.code,
      })
      .from(classes)
      .leftJoin(classCatalog, eq(classes.catalogClassId, classCatalog.id))
      .where(
        and(
          eq(classes.schoolId, schoolId),
          eq(classes.teacherId, memberId),
          eq(classes.isActive, true),
        )
      )

    if (teacherClasses.length === 0) return []
    const classIds = teacherClasses.map(c => c.classId)

    const [enrollments, grades] = await Promise.all([
      db
        .select({
          studentId: classEnrollments.studentId,
          classId: classEnrollments.classId,
          firstName: students.firstName,
          lastName: students.lastName,
          studentCustomId: students.studentCustomId,
        })
        .from(classEnrollments)
        .leftJoin(students, eq(classEnrollments.studentId, students.id))
        .where(
          and(
            inArray(classEnrollments.classId, classIds),
            eq(classEnrollments.schoolId, schoolId),
            isNull(classEnrollments.unenrolledAt),
          )
        ),

      db
        .select({ studentId: examResults.studentId, classId: examResults.classId, id: examResults.id })
        .from(examResults)
        .where(
          and(
            inArray(examResults.classId, classIds),
            eq(examResults.schoolId, schoolId),
            eq(examResults.trimester, trimester),
          )
        ),
    ])

    const gradedMap = new Map(grades.map(g => [`${g.classId}:${g.studentId}`, g.id]))

    const studentsByClass = enrollments.reduce<Record<string, StudentGradeStatus[]>>((acc, e) => {
      if (!acc[e.classId]) acc[e.classId] = []
      const key = `${e.classId}:${e.studentId}`
      acc[e.classId].push({
        studentId: e.studentId,
        firstName: e.firstName ?? '',
        lastName: e.lastName ?? '',
        studentCustomId: e.studentCustomId,
        isGraded: gradedMap.has(key),
        examResultId: gradedMap.get(key) ?? null,
      })
      return acc
    }, {})

    return teacherClasses.map(c => {
      const studentList = studentsByClass[c.classId] ?? []
      return {
        classId: c.classId,
        className: c.className,
        room: c.room,
        subjectCode: c.subjectCode ?? null,
        catalogCode: c.catalogCode ?? null,
        students: studentList,
        totalStudents: studentList.length,
        gradedCount: studentList.filter(s => s.isGraded).length,
      }
    })
  },

  async getStudentForGradeForm(
    studentId: string,
    classId: string,
    schoolId: string,
  ): Promise<GradeFormStudent | null> {
    const [[studentRow], [classRow]] = await Promise.all([
      db
        .select({
          firstName: students.firstName,
          lastName: students.lastName,
          studentCustomId: students.studentCustomId,
        })
        .from(students)
        .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
        .limit(1),

      db
        .select({
          name: classes.name,
          catalogCode: classCatalog.code,
          subjectCode: classCatalog.subjectCode,
        })
        .from(classes)
        .leftJoin(classCatalog, eq(classes.catalogClassId, classCatalog.id))
        .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)))
        .limit(1),
    ])

    if (!studentRow || !classRow) return null

    return {
      studentId,
      firstName: studentRow.firstName,
      lastName: studentRow.lastName,
      studentCustomId: studentRow.studentCustomId,
      classId,
      className: classRow.name,
      catalogCode: classRow.catalogCode ?? null,
      subjectCode: classRow.subjectCode ?? null,
    }
  },

  async getExamResult(
    classId: string,
    studentId: string,
    schoolId: string,
    trimester: number,
  ): Promise<ExamResult | null> {
    const [row] = await db
      .select()
      .from(examResults)
      .where(
        and(
          eq(examResults.classId, classId),
          eq(examResults.studentId, studentId),
          eq(examResults.schoolId, schoolId),
          eq(examResults.trimester, trimester),
        )
      )
      .limit(1)

    if (!row) return null
    return {
      id: row.id,
      schoolId: row.schoolId,
      classId: row.classId,
      studentId: row.studentId,
      trimester: row.trimester,
      academicYear: row.academicYear,
      attendance: row.attendance,
      respectTeachers: row.respectTeachers,
      respectOthers: row.respectOthers,
      bringBooks: row.bringBooks,
      participation: row.participation,
      eagerness: row.eagerness,
      coveredContent: row.coveredContent,
      generalComments: row.generalComments,
      score: row.score,
      parentSignature: row.parentSignature,
      submittedBy: row.submittedBy,
      submittedAt: row.submittedAt,
    }
  },

  async submitExamResult(
    schoolId: string,
    memberId: string,
    data: SubmitExamInput,
  ): Promise<void> {
    const existing = await this.getExamResult(data.classId, data.studentId, schoolId, data.trimester)

    const values = {
      schoolId,
      classId: data.classId,
      studentId: data.studentId,
      trimester: data.trimester,
      academicYear: data.academicYear,
      attendance: data.attendance,
      respectTeachers: data.respectTeachers,
      respectOthers: data.respectOthers,
      bringBooks: data.bringBooks,
      participation: data.participation,
      eagerness: data.eagerness,
      coveredContent: data.coveredContent ?? null,
      generalComments: data.generalComments ?? null,
      score: data.score,
      submittedBy: memberId,
      submittedAt: new Date(),
    }

    if (existing) {
      await db
        .update(examResults)
        .set(values)
        .where(eq(examResults.id, existing.id))
    } else {
      await db.insert(examResults).values(values)
    }
  },

  // ── Admin ────────────────────────────────────────────────────────────────────

  async getClassesWithProgress(
    schoolId: string,
    trimester: number,
  ): Promise<AdminExamClassProgress[]> {
    const allClasses = await db
      .select({
        classId: classes.id,
        className: classes.name,
        catalogCode: classCatalog.code,
        subjectCode: classCatalog.subjectCode,
        teacherName: profiles.fullName,
      })
      .from(classes)
      .leftJoin(classCatalog, eq(classes.catalogClassId, classCatalog.id))
      .leftJoin(schoolMembers, eq(classes.teacherId, schoolMembers.id))
      .leftJoin(profiles, eq(schoolMembers.userId, profiles.userId))
      .where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true)))

    if (allClasses.length === 0) return []
    const classIds = allClasses.map(c => c.classId)

    const [enrollments, grades] = await Promise.all([
      db
        .select({
          classId: classEnrollments.classId,
          studentId: classEnrollments.studentId,
          firstName: students.firstName,
          lastName: students.lastName,
          studentCustomId: students.studentCustomId,
        })
        .from(classEnrollments)
        .leftJoin(students, eq(classEnrollments.studentId, students.id))
        .where(
          and(
            inArray(classEnrollments.classId, classIds),
            eq(classEnrollments.schoolId, schoolId),
            isNull(classEnrollments.unenrolledAt),
          )
        ),

      db
        .select({
          classId: examResults.classId,
          studentId: examResults.studentId,
          parentSignature: examResults.parentSignature,
        })
        .from(examResults)
        .where(
          and(
            inArray(examResults.classId, classIds),
            eq(examResults.schoolId, schoolId),
            eq(examResults.trimester, trimester),
          )
        ),
    ])

    const gradedByClass = grades.reduce<Record<string, { studentId: string; parentSignature: string | null }[]>>(
      (acc, g) => {
        if (!acc[g.classId]) acc[g.classId] = []
        acc[g.classId].push({ studentId: g.studentId, parentSignature: g.parentSignature })
        return acc
      }, {}
    )

    const enrollmentsByClass = enrollments.reduce<Record<string, { studentId: string; firstName: string; lastName: string; studentCustomId: string | null }[]>>(
      (acc, e) => {
        if (!acc[e.classId]) acc[e.classId] = []
        acc[e.classId].push({
          studentId: e.studentId,
          firstName: e.firstName ?? '',
          lastName: e.lastName ?? '',
          studentCustomId: e.studentCustomId,
        })
        return acc
      }, {}
    )

    return allClasses.map(c => {
      const enrolled = enrollmentsByClass[c.classId] ?? []
      const graded = gradedByClass[c.classId] ?? []
      const gradedSet = new Set(graded.map(g => g.studentId))
      const signedCount = graded.filter(g => g.parentSignature).length

      const pendingStudents = enrolled
        .filter(s => !gradedSet.has(s.studentId))
        .map(s => ({ name: `${s.firstName} ${s.lastName}`, customId: s.studentCustomId }))

      const gradedStudents = enrolled
        .filter(s => gradedSet.has(s.studentId))
        .map(s => ({
          name: `${s.firstName} ${s.lastName}`,
          customId: s.studentCustomId,
          isSigned: !!graded.find(g => g.studentId === s.studentId)?.parentSignature,
        }))

      const percentage = enrolled.length > 0 ? Math.round((graded.length / enrolled.length) * 100) : 0

      return {
        classId: c.classId,
        className: c.className,
        catalogCode: c.catalogCode ?? null,
        subjectCode: c.subjectCode ?? null,
        teacherName: c.teacherName ?? null,
        totalStudents: enrolled.length,
        gradedCount: graded.length,
        pendingCount: enrolled.length - graded.length,
        signedCount,
        totalSignable: graded.length,
        percentage,
        pendingStudents,
        gradedStudents,
      }
    })
  },

  async getStudentsWithProgress(
    schoolId: string,
    trimester: number,
  ): Promise<AdminExamStudentProgress[]> {
    const allClasses = await db
      .select({
        classId: classes.id,
        className: classes.name,
        catalogCode: classCatalog.code,
      })
      .from(classes)
      .leftJoin(classCatalog, eq(classes.catalogClassId, classCatalog.id))
      .where(and(eq(classes.schoolId, schoolId), eq(classes.isActive, true)))

    if (allClasses.length === 0) return []
    const classIds = allClasses.map(c => c.classId)
    const classMap = new Map(allClasses.map(c => [c.classId, c]))

    const [enrollments, grades] = await Promise.all([
      db
        .select({
          classId: classEnrollments.classId,
          studentId: classEnrollments.studentId,
          firstName: students.firstName,
          lastName: students.lastName,
          studentCustomId: students.studentCustomId,
        })
        .from(classEnrollments)
        .leftJoin(students, eq(classEnrollments.studentId, students.id))
        .where(
          and(
            inArray(classEnrollments.classId, classIds),
            eq(classEnrollments.schoolId, schoolId),
            isNull(classEnrollments.unenrolledAt),
          )
        ),

      db
        .select()
        .from(examResults)
        .where(
          and(
            inArray(examResults.classId, classIds),
            eq(examResults.schoolId, schoolId),
            eq(examResults.trimester, trimester),
          )
        ),
    ])

    const gradeMap = new Map(grades.map(g => [`${g.classId}:${g.studentId}`, g]))

    // Group enrollments by student
    const byStudent = enrollments.reduce<Record<string, {
      firstName: string; lastName: string; studentCustomId: string | null;
      classes: { classId: string; className: string; classCode: string | null }[]
    }>>((acc, e) => {
      if (!acc[e.studentId]) {
        acc[e.studentId] = {
          firstName: e.firstName ?? '',
          lastName: e.lastName ?? '',
          studentCustomId: e.studentCustomId,
          classes: [],
        }
      }
      const cls = classMap.get(e.classId)
      if (cls) {
        acc[e.studentId].classes.push({
          classId: e.classId,
          className: cls.className,
          classCode: cls.catalogCode ?? null,
        })
      }
      return acc
    }, {})

    return Object.entries(byStudent).map(([studentId, info]) => {
      const classesWithStatus = info.classes.map(cls => {
        const grade = gradeMap.get(`${cls.classId}:${studentId}`)
        return {
          classId: cls.classId,
          className: cls.className,
          classCode: cls.classCode,
          isGraded: !!grade,
          isSigned: !!grade?.parentSignature,
        }
      })

      const gradedGrades = grades.filter(g => g.studentId === studentId)
      const avgScores = gradedGrades.map(g => computeAverageScore(g)).filter((v): v is number => v !== null)
      const averageScore = avgScores.length > 0
        ? Math.round(avgScores.reduce((s, v) => s + v, 0) / avgScores.length)
        : null

      return {
        studentId,
        firstName: info.firstName,
        lastName: info.lastName,
        studentCustomId: info.studentCustomId,
        classes: classesWithStatus,
        gradedClasses: classesWithStatus.filter(c => c.isGraded).length,
        totalClasses: classesWithStatus.length,
        averageScore,
      }
    })
  },

  // ── Parent ───────────────────────────────────────────────────────────────────

  async getChildrenGrades(
    schoolMemberId: string,
    schoolId: string,
    trimester: number,
  ): Promise<ParentChildExamData[]> {
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

    const [studentRows, enrollmentRows, gradeRows] = await Promise.all([
      db
        .select({
          id: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          studentCustomId: students.studentCustomId,
        })
        .from(students)
        .where(inArray(students.id, studentIds)),

      db
        .select({
          studentId: classEnrollments.studentId,
          classId: classEnrollments.classId,
          className: classes.name,
          teacherName: profiles.fullName,
        })
        .from(classEnrollments)
        .leftJoin(classes, eq(classEnrollments.classId, classes.id))
        .leftJoin(schoolMembers, eq(classes.teacherId, schoolMembers.id))
        .leftJoin(profiles, eq(schoolMembers.userId, profiles.userId))
        .where(
          and(
            inArray(classEnrollments.studentId, studentIds),
            eq(classEnrollments.schoolId, schoolId),
            isNull(classEnrollments.unenrolledAt),
          )
        ),

      db
        .select()
        .from(examResults)
        .where(
          and(
            inArray(examResults.studentId, studentIds),
            eq(examResults.schoolId, schoolId),
            eq(examResults.trimester, trimester),
          )
        ),
    ])

    const gradeMap = new Map(gradeRows.map(g => [`${g.classId}:${g.studentId}`, g]))
    const enrollmentsByStudent = enrollmentRows.reduce<Record<string, typeof enrollmentRows>>((acc, e) => {
      if (!acc[e.studentId]) acc[e.studentId] = []
      acc[e.studentId].push(e)
      return acc
    }, {})

    return studentRows.map(s => {
      const enrollments = enrollmentsByStudent[s.id] ?? []
      const grades: ParentExamGrade[] = []

      for (const enr of enrollments) {
        const grade = gradeMap.get(`${enr.classId}:${s.id}`)
        if (!grade) continue
        grades.push({
          classId: enr.classId,
          className: enr.className ?? '',
          teacherName: enr.teacherName ?? null,
          examResultId: grade.id,
          attendance: grade.attendance,
          respectTeachers: grade.respectTeachers,
          respectOthers: grade.respectOthers,
          bringBooks: grade.bringBooks,
          participation: grade.participation,
          eagerness: grade.eagerness,
          coveredContent: grade.coveredContent,
          generalComments: grade.generalComments,
          score: grade.score,
          parentSignature: grade.parentSignature,
        })
      }

      return {
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        studentCustomId: s.studentCustomId,
        grades,
      }
    })
  },

  async signGrade(
    examResultId: string,
    parentSignature: string,
    schoolId: string,
  ): Promise<void> {
    await db
      .update(examResults)
      .set({ parentSignature })
      .where(
        and(eq(examResults.id, examResultId), eq(examResults.schoolId, schoolId))
      )
  },
}
