import { db } from '@/db'
import {
  payments, students, guardians, parentStudents, schoolMembers, profiles,
} from '@/db/schema'
import { and, eq, inArray, desc, sql } from 'drizzle-orm'
import type { CreatePaymentInput, CreateParentPaymentInput } from './payments.schema'
import type { PaymentListItem, PaymentKpis, ChildPaymentStatus, UnpaidParent } from './payments.types'

const PAID_PERIODS = new Set(['trimester_1', 'trimester_2', 'trimester_3', 'annually'])

export const paymentsService = {
  async getAll(schoolId: string): Promise<PaymentListItem[]> {
    const rows = await db
      .select({
        id: payments.id,
        date: payments.paymentDate,
        parentName: payments.parentName,
        studentId: payments.studentId,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        category: payments.category,
        period: payments.period,
        method: payments.method,
        financialOption: payments.financialOption,
        amount: payments.amount,
        status: payments.status,
        source: payments.source,
        notes: payments.notes,
        submittedBy: payments.submittedBy,
        submittedByName: profiles.fullName,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(students, eq(students.id, payments.studentId))
      .leftJoin(schoolMembers, eq(schoolMembers.id, payments.submittedBy))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(eq(payments.schoolId, schoolId))
      .orderBy(desc(payments.createdAt))

    const parentMemberIds = Array.from(
      new Set(rows.filter(r => r.source === 'parent' && r.submittedBy).map(r => r.submittedBy as string))
    )

    let emailByMember = new Map<string, string>()
    if (parentMemberIds.length > 0) {
      const emailRows = await db.execute(sql`
        SELECT sm.id AS member_id, au.email
        FROM school_members sm
        LEFT JOIN auth.users au ON au.id = sm.user_id
        WHERE sm.id IN (${sql.join(parentMemberIds.map(id => sql`${id}`), sql`, `)})
      `)
      emailByMember = new Map(
        (emailRows as unknown as { member_id: string; email: string | null }[])
          .filter(r => r.email)
          .map(r => [r.member_id, r.email as string])
      )
    }

    return rows.map(r => ({
      id: r.id,
      date: r.date,
      parentName: r.parentName,
      studentId: r.studentId,
      studentName: r.studentFirstName ? `${r.studentFirstName} ${r.studentLastName}` : '—',
      category: r.category,
      period: r.period,
      method: r.method,
      financialOption: r.financialOption,
      amount: r.amount,
      status: r.status,
      source: r.source,
      submittedByLabel: r.source === 'parent'
        ? (emailByMember.get(r.submittedBy ?? '') ?? r.submittedByName ?? '—')
        : (r.submittedByName ?? '—'),
      notes: r.notes,
    }))
  },

  async getKpis(schoolId: string): Promise<PaymentKpis> {
    const rows = await db
      .select({ amount: payments.amount, status: payments.status, source: payments.source })
      .from(payments)
      .where(eq(payments.schoolId, schoolId))

    const totalRevenue = rows
      .filter(r => r.status === 'verified')
      .reduce((sum, r) => sum + r.amount, 0)

    const pendingVerification = rows
      .filter(r => r.status === 'pending' && r.source === 'parent')
      .reduce((sum, r) => sum + r.amount, 0)

    return { totalRevenue, pendingVerification }
  },

  async create(
    schoolId: string,
    memberId: string,
    input: CreatePaymentInput,
    source: 'admin' | 'parent' = 'admin',
    parentNameOverride?: string | null,
  ): Promise<void> {
    const status = source === 'parent' ? 'pending' : input.status
    for (const studentId of input.studentIds) {
      await db.insert(payments).values({
        schoolId,
        studentId,
        parentName: source === 'parent' ? (parentNameOverride ?? null) : input.parentName,
        amount: input.amount,
        method: input.method,
        category: input.category,
        period: input.period,
        financialOption: input.financialOption,
        status,
        source,
        notes: input.notes,
        paymentDate: input.paymentDate,
        submittedBy: memberId,
      })
    }
  },

  async update(schoolId: string, id: string, input: CreatePaymentInput): Promise<void> {
    const [studentId] = input.studentIds
    await db
      .update(payments)
      .set({
        studentId,
        parentName: input.parentName,
        amount: input.amount,
        method: input.method,
        category: input.category,
        period: input.period,
        financialOption: input.financialOption,
        status: input.status,
        notes: input.notes,
        paymentDate: input.paymentDate,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, id), eq(payments.schoolId, schoolId)))
  },

  async delete(schoolId: string, id: string): Promise<void> {
    await db.delete(payments).where(and(eq(payments.id, id), eq(payments.schoolId, schoolId)))
  },

  async verify(schoolId: string, id: string): Promise<void> {
    await db
      .update(payments)
      .set({ status: 'verified', updatedAt: new Date() })
      .where(and(eq(payments.id, id), eq(payments.schoolId, schoolId)))
  },

  async reject(schoolId: string, id: string): Promise<void> {
    await db
      .update(payments)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(and(eq(payments.id, id), eq(payments.schoolId, schoolId)))
  },

  async getChildrenPaymentStatus(schoolId: string, parentMemberId: string): Promise<ChildPaymentStatus[]> {
    const linked = await db
      .select({ studentId: parentStudents.studentId })
      .from(parentStudents)
      .where(and(eq(parentStudents.schoolMemberId, parentMemberId), eq(parentStudents.schoolId, schoolId)))

    if (linked.length === 0) return []
    const studentIds = linked.map(r => r.studentId)

    const [studentRows, paymentRows] = await Promise.all([
      db
        .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
        .from(students)
        .where(inArray(students.id, studentIds)),

      db
        .select({ studentId: payments.studentId, period: payments.period, status: payments.status })
        .from(payments)
        .where(and(inArray(payments.studentId, studentIds), eq(payments.schoolId, schoolId))),
    ])

    const byStudent = paymentRows.reduce<Record<string, { period: string; status: string }[]>>((acc, p) => {
      if (!p.studentId) return acc
      if (!acc[p.studentId]) acc[p.studentId] = []
      acc[p.studentId].push({ period: p.period, status: p.status })
      return acc
    }, {})

    function statusFor(entries: { period: string; status: string }[], period: string): 'paid' | 'pending' | 'unpaid' {
      const annualVerified = entries.some(e => e.period === 'annually' && e.status === 'verified')
      if (annualVerified) return 'paid'
      const verified = entries.some(e => e.period === period && e.status === 'verified')
      if (verified) return 'paid'
      const pending = entries.some(e => (e.period === period || e.period === 'annually') && e.status === 'pending')
      if (pending) return 'pending'
      return 'unpaid'
    }

    return studentRows.map(s => {
      const entries = byStudent[s.id] ?? []
      return {
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        t1: statusFor(entries, 'trimester_1'),
        t2: statusFor(entries, 'trimester_2'),
        t3: statusFor(entries, 'trimester_3'),
      }
    })
  },

  async getUnpaidParents(schoolId: string, period: string): Promise<UnpaidParent[]> {
    const [studentRows, paymentRows, guardianRows] = await Promise.all([
      db
        .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
        .from(students)
        .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true))),

      db
        .select({ studentId: payments.studentId, period: payments.period, status: payments.status })
        .from(payments)
        .where(eq(payments.schoolId, schoolId)),

      db
        .select({ studentId: guardians.studentId, email: guardians.email })
        .from(guardians)
        .where(and(eq(guardians.schoolId, schoolId), eq(guardians.isPrimary, true))),
    ])

    const paidStudentIds = new Set(
      paymentRows
        .filter(p => p.status === 'verified' && PAID_PERIODS.has(p.period) && (p.period === period || p.period === 'annually'))
        .map(p => p.studentId)
    )

    const unpaidStudents = studentRows.filter(s => !paidStudentIds.has(s.id))
    const guardianByStudent = new Map(guardianRows.filter(g => g.email).map(g => [g.studentId, g.email as string]))

    const byEmail = new Map<string, string[]>()
    for (const s of unpaidStudents) {
      const email = guardianByStudent.get(s.id)
      if (!email) continue
      const name = `${s.firstName} ${s.lastName}`
      if (!byEmail.has(email)) byEmail.set(email, [])
      byEmail.get(email)!.push(name)
    }

    return Array.from(byEmail.entries()).map(([email, studentNames]) => ({ email, studentNames }))
  },
}
