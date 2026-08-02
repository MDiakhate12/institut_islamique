import { db } from '@/db'
import {
  wageEntries, schoolMembers, profiles, classes, classCatalog,
} from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { schoolService } from '@/modules/school/school.service'
import type {
  WageEntry, WageTimesheet, WageKpis, TeacherOption, TeacherClassOption,
} from './wages.types'

async function buildTimesheet(schoolId: string, teacherId?: string): Promise<WageTimesheet> {
  const rows = await db
    .select({
      id: wageEntries.id,
      teacherId: wageEntries.teacherId,
      teacherName: profiles.fullName,
      classId: wageEntries.classId,
      className: classes.name,
      classCode: classCatalog.code,
      date: wageEntries.date,
      hoursWorked: wageEntries.hoursWorked,
      hourlyRateCents: wageEntries.hourlyRateCents,
      amountCents: wageEntries.amountCents,
      status: wageEntries.status,
    })
    .from(wageEntries)
    .leftJoin(schoolMembers, eq(schoolMembers.id, wageEntries.teacherId))
    .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
    .leftJoin(classes, eq(classes.id, wageEntries.classId))
    .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
    .where(
      teacherId
        ? and(eq(wageEntries.schoolId, schoolId), eq(wageEntries.teacherId, teacherId))
        : eq(wageEntries.schoolId, schoolId)
    )
    .orderBy(wageEntries.date)

  const entries: WageEntry[] = rows.map(r => ({
    id: r.id,
    schoolId,
    teacherId: r.teacherId,
    teacherName: r.teacherName ?? '—',
    classId: r.classId,
    className: r.className,
    classCode: r.classCode,
    date: r.date,
    hoursWorked: r.hoursWorked,
    hourlyRateCents: r.hourlyRateCents,
    amountCents: r.amountCents,
    status: r.status,
  }))

  const byTeacher = entries.reduce<Record<string, { teacherName: string; entries: WageEntry[] }>>((acc, e) => {
    if (!acc[e.teacherId]) acc[e.teacherId] = { teacherName: e.teacherName, entries: [] }
    acc[e.teacherId].entries.push(e)
    return acc
  }, {})

  const dates = Array.from(new Set(entries.map(e => e.date))).sort()

  const timesheetRows = Object.entries(byTeacher).map(([tId, info]) => {
    const entriesByDate = info.entries.reduce<Record<string, WageEntry[]>>((acc, e) => {
      if (!acc[e.date]) acc[e.date] = []
      acc[e.date].push(e)
      return acc
    }, {})
    return {
      teacherId: tId,
      teacherName: info.teacherName,
      entriesByDate,
      totalHours: info.entries.reduce((s, e) => s + e.hoursWorked, 0),
      totalAmountCents: info.entries.reduce((s, e) => s + e.amountCents, 0),
    }
  })

  return {
    rows: timesheetRows,
    dates,
    totalHours: entries.reduce((s, e) => s + e.hoursWorked, 0),
    totalAmountCents: entries.reduce((s, e) => s + e.amountCents, 0),
    teacherCount: timesheetRows.length,
    sessionCount: entries.length,
  }
}

export const wagesService = {
  async getTimesheet(schoolId: string): Promise<WageTimesheet> {
    return buildTimesheet(schoolId)
  },

  async getForTeacher(schoolId: string, teacherId: string): Promise<WageTimesheet> {
    return buildTimesheet(schoolId, teacherId)
  },

  async getKpis(schoolId: string, teacherId?: string): Promise<WageKpis> {
    const rows = await db
      .select({ amountCents: wageEntries.amountCents, status: wageEntries.status })
      .from(wageEntries)
      .where(
        teacherId
          ? and(eq(wageEntries.schoolId, schoolId), eq(wageEntries.teacherId, teacherId))
          : eq(wageEntries.schoolId, schoolId)
      )

    return {
      approved: rows.filter(r => r.status === 'approved').reduce((s, r) => s + r.amountCents, 0),
      pending: rows.filter(r => r.status === 'pending').reduce((s, r) => s + r.amountCents, 0),
      paid: rows.filter(r => r.status === 'paid').reduce((s, r) => s + r.amountCents, 0),
    }
  },

  async getTeacherOptions(schoolId: string): Promise<TeacherOption[]> {
    const rows = await db
      .select({ id: schoolMembers.id, name: profiles.fullName })
      .from(schoolMembers)
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(
        and(
          eq(schoolMembers.schoolId, schoolId),
          sql`'teacher' = ANY(${schoolMembers.portalRoles})`
        )
      )

    return rows.map(r => ({ id: r.id, name: r.name ?? '—' }))
  },

  async getTeacherClassOptions(schoolId: string, teacherId: string): Promise<TeacherClassOption[]> {
    const rows = await db
      .select({ id: classes.id, name: classes.name, classCode: classCatalog.code })
      .from(classes)
      .leftJoin(classCatalog, eq(classCatalog.id, classes.catalogClassId))
      .where(and(eq(classes.schoolId, schoolId), eq(classes.teacherId, teacherId), eq(classes.isActive, true)))

    return rows
  },

  async logHours(
    schoolId: string,
    memberId: string,
    teacherId: string,
    input: { classId: string | null; date: string; hoursWorked: number },
  ): Promise<void> {
    const school = await schoolService.getById(schoolId)
    const hourlyRateCents = Math.round((school?.settings?.teacherHourlyRate ?? 0) * 100)

    await db.insert(wageEntries).values({
      schoolId,
      teacherId,
      classId: input.classId,
      date: input.date,
      hoursWorked: input.hoursWorked,
      hourlyRateCents,
      amountCents: hourlyRateCents * input.hoursWorked,
      status: 'pending',
      submittedBy: memberId,
    })
  },

  async updateStatus(schoolId: string, id: string, status: string, hourlyRateCents: number): Promise<void> {
    const [existing] = await db
      .select({ hoursWorked: wageEntries.hoursWorked })
      .from(wageEntries)
      .where(and(eq(wageEntries.id, id), eq(wageEntries.schoolId, schoolId)))
      .limit(1)

    if (!existing) return

    await db
      .update(wageEntries)
      .set({
        status: status as 'pending' | 'approved' | 'rejected' | 'paid',
        hourlyRateCents,
        amountCents: hourlyRateCents * existing.hoursWorked,
        updatedAt: new Date(),
      })
      .where(and(eq(wageEntries.id, id), eq(wageEntries.schoolId, schoolId)))
  },
}
