export type Payment = {
  id: string
  schoolId: string
  studentId: string | null
  amount: number
  currency: string
  method: string
  category: string
  period: string
  financialOption: string | null
  status: string
  source: string
  notes: string | null
  paymentDate: string | null
  submittedBy: string | null
  createdAt: Date
}

export type PaymentListItem = {
  id: string
  date: string | null
  parentName: string | null
  studentId: string | null
  studentName: string
  category: string
  period: string
  method: string
  financialOption: string | null
  amount: number
  status: string
  source: string
  submittedByLabel: string
  notes: string | null
}

// Champs minimum requis par PaymentFormDialog pour pré-remplir l'édition — PaymentListItem
// et StudentPayment (via un objet construit côté client) le satisfont tous les deux.
export type EditablePayment = {
  id: string
  studentId: string | null
  parentName: string | null
  amount: number
  category: string
  period: string
  method: string
  financialOption: string | null
  status: string
  date: string | null
  notes: string | null
}

export type PaymentKpis = {
  totalRevenue: number
  pendingVerification: number
}

export type ChildPaymentStatus = {
  studentId: string
  studentName: string
  t1: 'paid' | 'pending' | 'unpaid'
  t2: 'paid' | 'pending' | 'unpaid'
  t3: 'paid' | 'pending' | 'unpaid'
  // true si les 3 sont payés via un seul paiement annuel (affichage distinct de 3 paiements séparés)
  isAnnual: boolean
}

export type UnpaidParent = {
  email: string
  studentNames: string[]
}
