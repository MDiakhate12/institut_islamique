import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { students, classEnrollments, classes } from '@/db/schema'

export type Student    = InferSelectModel<typeof students>
export type NewStudent = InferInsertModel<typeof students>

export type GuardianSummary = {
  id: string
  relationship: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  isPrimary: boolean
}

export type StudentListItem = Pick<
  Student,
  | 'id' | 'firstName' | 'lastName' | 'gender' | 'birthDate' | 'isActive' | 'createdAt'
  | 'studentCustomId' | 'notes'
> & {
  activeClassName?:  string | null
  activeClassId?:    string | null
  academicYear?:     string | null
  enrollmentId?:     string | null
  enrolledAt?:       Date | string | null
  guardians:         GuardianSummary[]
}
