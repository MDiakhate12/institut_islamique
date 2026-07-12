import { db } from '@/db'
import { classes, classCatalog, schoolMembers, profiles } from '@/db/schema'
import { eq, and, or, sql } from 'drizzle-orm'
import type { MyClass } from './teacher-classes.types'

export const teacherClassesService = {
  async getMyClasses(schoolId: string, memberId: string): Promise<MyClass[]> {
    const rows = await db
      .select({
        classId:      classes.id,
        catalogCode:  classCatalog.code,
        subjectCode:  classCatalog.subjectCode,
        levelNumber:  classCatalog.levelNumber,
        name:         classes.name,
        room:         classes.room,
        section:      classes.section,
        teacherName:  profiles.fullName,
        curriculum:   classCatalog.curriculum,
        studentCount: sql<number>`(
          SELECT count(*) FROM class_enrollments ce
          WHERE ce.class_id = ${classes.id} AND ce.school_id = ${schoolId}
        )::int`,
      })
      .from(classes)
      .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
      .leftJoin(schoolMembers, eq(schoolMembers.id, classes.teacherId))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(
        and(
          eq(classes.schoolId, schoolId),
          eq(classes.isActive, true),
          or(
            eq(classes.teacherId, memberId),
            eq(classes.assistantTeacherId, memberId),
          ),
        )
      )
      .orderBy(classCatalog.subjectCode, classCatalog.levelNumber, classes.section)

    return rows.map(r => ({
      classId:        r.classId,
      catalogCode:    r.catalogCode ?? '',
      subjectCode:    r.subjectCode ?? '',
      levelNumber:    r.levelNumber ?? null,
      name:           r.name,
      room:           r.room ?? null,
      section:        r.section ?? null,
      teacherName:    r.teacherName ?? null,
      teacherInitial: r.teacherName?.[0]?.toUpperCase() ?? null,
      curriculum:     r.curriculum ?? null,
      studentCount:   r.studentCount ?? 0,
    }))
  },
}
