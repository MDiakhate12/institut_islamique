import { db } from '@/db'
import { classes, schoolMembers, profiles } from '@/db/schema'
import { eq, and, or, sql } from 'drizzle-orm'
import type { MyClass } from './teacher-classes.types'

export const teacherClassesService = {
  async getMyClasses(schoolId: string, memberId: string): Promise<MyClass[]> {
    const rows = await db
      .select({
        classId:      classes.id,
        catalogCode:  classes.subject,
        subjectCode:  classes.subject,
        name:         classes.name,
        room:         classes.room,
        curriculum:   classes.curriculum,
        teacherName:  profiles.fullName,
        studentCount: sql<number>`(
          SELECT count(*) FROM class_enrollments ce
          WHERE ce.class_id = ${classes.id} AND ce.school_id = ${schoolId}
        )::int`,
      })
      .from(classes)
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
      .orderBy(classes.subject, classes.name)

    return rows.map(r => ({
      classId:        r.classId,
      catalogCode:    r.catalogCode ?? '',
      subjectCode:    r.subjectCode ?? '',
      name:           r.name,
      room:           r.room ?? null,
      curriculum:     r.curriculum ?? null,
      teacherName:    r.teacherName ?? null,
      teacherInitial: r.teacherName?.[0]?.toUpperCase() ?? null,
      studentCount:   r.studentCount ?? 0,
    }))
  },
}
