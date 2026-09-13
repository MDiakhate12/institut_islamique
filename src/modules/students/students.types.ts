import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { students } from '@/db/schema'

export type Student    = InferSelectModel<typeof students>
export type NewStudent = InferInsertModel<typeof students>

export type GuardianSummary = {
  id: string
  relationship: string
  firstName: string | null
  lastName: string
  email: string | null
  phone: string | null
  emergencyPhone: string | null
  isPrimary: boolean
  linkedMemberId: string | null
  linkedMemberName: string | null
}

export function guardianDisplayName(g: GuardianSummary): string {
  if (g.linkedMemberName) return g.linkedMemberName
  if (g.firstName) return `${g.firstName} ${g.lastName}`.trim()
  return 'Nom non renseigné'
}

export function calcAge(birthDate: string | null | undefined): string {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  const now = new Date()
  const totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  return `${Math.floor(totalMonths / 12)}a ${totalMonths % 12}m`
}

export type StudentEnrollment = {
  enrollmentId: string
  classId: string
  classCode: string
  className: string
  teacherName: string | null
  room: string | null
  section: string | null
  paymentPlan: string
  paidT1: boolean
  paidT2: boolean
  paidT3: boolean
}

export type StudentListItem = Pick<
  Student,
  | 'id' | 'firstName' | 'lastName' | 'gender' | 'birthDate' | 'isActive' | 'createdAt'
  | 'studentCustomId' | 'notes' | 'enrollmentYear'
> & {
  enrollments:          StudentEnrollment[]
  phone:                string | null
  guardians:            GuardianSummary[]
  enrolledAt:           Date | string | null
  attendancePresent:    number
  attendanceLate:       number
  attendanceAbsent:     number
  attendanceExcused:    number
  lastAttendanceDate:   string | null
  // Shortcut to first enrollment payment status (backward compat)
  paymentT1:            boolean
  paymentT2:            boolean
  paymentT3:            boolean
  // true si les 3 sont payés via un seul paiement annuel (affichage distinct de 3 paiements séparés)
  paymentAnnual:        boolean
}

export type StudentPayment = {
  id: string
  studentId: string
  date: string | null
  academicYear: string | null
  amountCents: number
  currency: string
  category: string
  period: string
  method: string
  financialOption: string | null
  status: string
  parentName: string | null
  notes: string | null
}

export type StudentAttendanceDay = {
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
}

export type StudentHomeworkItem = {
  id: string
  date: string
  classCode: string
  className: string
  title: string
  surahName: string | null
  surahArabic: string | null
  starsCount: number | null
}

export type StudentExamResult = {
  id: string
  classCode: string
  className: string
  teacherName: string | null
  trimester: number
  academicYear: string | null
  score: number | null
  eagerness: number | null       // "Caring" dans le bulletin
  participation: number | null
  respectTeachers: number | null
  respectOthers: number | null
  attendance: number | null
  bringBooks: number | null
  coveredContent: string | null
  generalComments: string | null
  parentSignature: string | null
}

export type StudentReportCardData = {
  schoolName: string
  examResults: StudentExamResult[]
  totalStars: number
  gradedSubmissions: number
}
