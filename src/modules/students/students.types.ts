import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { students, classEnrollments, classes } from '@/db/schema'

// Types de base inférés depuis le schéma Drizzle — source de vérité
export type Student = InferSelectModel<typeof students>
export type NewStudent = InferInsertModel<typeof students>

// Type étendu pour l'UI — avec classe active et compteur
export type StudentWithClass = Student & {
  activeEnrollment?: {
    classId: string
    className: string
    room: string | null
  } | null
}

// Type pour la liste (colonnes affichées dans la DataTable)
export type StudentListItem = Pick<
  Student,
  'id' | 'firstName' | 'lastName' | 'gender' | 'birthDate' | 'isActive' | 'createdAt'
> & {
  activeClassName?: string | null
  activeClassId?: string | null
}
