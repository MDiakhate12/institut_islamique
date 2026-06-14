import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { students, classEnrollments, classes } from '@/db/schema'

export type Student    = InferSelectModel<typeof students>
export type NewStudent = InferInsertModel<typeof students>

export type StudentListItem = Pick<
  Student,
  | 'id' | 'firstName' | 'lastName' | 'gender' | 'birthDate' | 'isActive' | 'createdAt'
  | 'parentPhone' | 'parentName1' | 'parentName2' | 'parentEmail1' | 'parentEmail2'
  | 'emergencyPhone' | 'studentCustomId' | 'notes'
> & {
  // Classe active
  activeClassName?:  string | null
  activeClassId?:    string | null
  academicYear?:     string | null
  enrollmentId?:     string | null
  enrolledAt?:       Date | string | null
  // Paiements par trimestre
  paidT1?: boolean | null
  paidT2?: boolean | null
  paidT3?: boolean | null
}
