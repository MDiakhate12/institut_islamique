import { db } from '@/db'
import { expenses, schoolMembers, profiles } from '@/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import type { CreateExpenseInput } from './expenses.schema'
import type { ExpenseListItem, ExpenseKpis } from './expenses.types'

async function mapRows(
  rows: {
    id: string
    createdAt: Date
    expenseDate: string | null
    amount: number
    description: string
    category: string | null
    status: string
    receiptUrl: string | null
    submittedByName: string | null
  }[]
): Promise<ExpenseListItem[]> {
  return rows.map(r => ({
    id: r.id,
    date: r.expenseDate ? new Date(r.expenseDate) : r.createdAt,
    amount: r.amount,
    description: r.description,
    category: r.category,
    status: r.status,
    receiptUrl: r.receiptUrl,
    submittedByName: r.submittedByName ?? '—',
  }))
}

export const expensesService = {
  async getAll(schoolId: string): Promise<ExpenseListItem[]> {
    const rows = await db
      .select({
        id: expenses.id,
        createdAt: expenses.createdAt,
        expenseDate: expenses.expenseDate,
        amount: expenses.amount,
        description: expenses.description,
        category: expenses.category,
        status: expenses.status,
        receiptUrl: expenses.receiptUrl,
        submittedByName: profiles.fullName,
      })
      .from(expenses)
      .leftJoin(schoolMembers, eq(schoolMembers.id, expenses.submittedBy))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(eq(expenses.schoolId, schoolId))
      .orderBy(desc(expenses.createdAt))

    return mapRows(rows)
  },

  async getBySubmitter(schoolId: string, memberId: string): Promise<ExpenseListItem[]> {
    const rows = await db
      .select({
        id: expenses.id,
        createdAt: expenses.createdAt,
        expenseDate: expenses.expenseDate,
        amount: expenses.amount,
        description: expenses.description,
        category: expenses.category,
        status: expenses.status,
        receiptUrl: expenses.receiptUrl,
        submittedByName: profiles.fullName,
      })
      .from(expenses)
      .leftJoin(schoolMembers, eq(schoolMembers.id, expenses.submittedBy))
      .leftJoin(profiles, eq(profiles.userId, schoolMembers.userId))
      .where(and(eq(expenses.schoolId, schoolId), eq(expenses.submittedBy, memberId)))
      .orderBy(desc(expenses.createdAt))

    return mapRows(rows)
  },

  async getKpis(schoolId: string, submittedBy?: string): Promise<ExpenseKpis> {
    const rows = await db
      .select({ amount: expenses.amount, status: expenses.status })
      .from(expenses)
      .where(
        submittedBy
          ? and(eq(expenses.schoolId, schoolId), eq(expenses.submittedBy, submittedBy))
          : eq(expenses.schoolId, schoolId)
      )

    return {
      approved: rows.filter(r => r.status === 'approved').reduce((s, r) => s + r.amount, 0),
      pending: rows.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0),
      paid: rows.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0),
    }
  },

  async create(schoolId: string, memberId: string, input: CreateExpenseInput, receiptUrl: string | null): Promise<void> {
    await db.insert(expenses).values({
      schoolId,
      amount: input.amount,
      description: input.description,
      category: input.category,
      expenseDate: input.date,
      receiptUrl,
      submittedBy: memberId,
      status: 'pending',
    })
  },

  async updateStatus(schoolId: string, id: string, status: string, approvedBy?: string): Promise<void> {
    await db
      .update(expenses)
      .set({
        status: status as 'pending' | 'approved' | 'paid' | 'rejected',
        approvedBy: status === 'approved' ? approvedBy : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(expenses.id, id), eq(expenses.schoolId, schoolId)))
  },
}
