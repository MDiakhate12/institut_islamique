import type { InferSelectModel } from 'drizzle-orm'
import { schoolMembers, profiles } from '@/db/schema'

export type SchoolMember = InferSelectModel<typeof schoolMembers>
export type Profile = InferSelectModel<typeof profiles>

// Enseignant = school_member avec rôle 'teacher' + données profil jointes
export type Teacher = {
  // Depuis school_members
  id: string           // id du school_member (utilisé partout comme teacherId)
  userId: string
  schoolId: string
  teacherType: 'volunteer' | 'paid' | null
  isPending: boolean
  createdAt: Date
  // Depuis profiles
  fullName: string | null
  phone: string | null
  gender: string | null
  avatarUrl: string | null
  documentUrl: string | null
  documentName: string | null
  // Depuis auth.users (email)
  email: string
}

// Type pour la liste (cards)
export type TeacherListItem = Teacher & {
  classCount: number
}
