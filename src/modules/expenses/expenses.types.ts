export type Expense = {
  id: string
  schoolId: string
  amount: number
  currency: string
  description: string
  category: string | null
  status: string
  receiptUrl: string | null
  submittedBy: string | null
  approvedBy: string | null
  createdAt: Date
}

export type ExpenseListItem = {
  id: string
  date: Date
  amount: number
  description: string
  category: string | null
  status: string
  receiptUrl: string | null
  submittedByName: string
}

export type ExpenseKpis = {
  approved: number
  pending: number
  paid: number
}
