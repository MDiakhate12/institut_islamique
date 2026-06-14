import type { InferSelectModel } from 'drizzle-orm'
import { classCatalog } from '@/db/schema'

export type CatalogClass = InferSelectModel<typeof classCatalog>

// Type enrichi avec le nom de la classe suivante (join)
export type CatalogClassWithNext = CatalogClass & {
  nextClassName: string | null
  nextClassCode: string | null
}

// Type for a scheduled class with all joined details
export type ClassWithDetails = {
  id: string
  schoolId: string
  catalogClassId: string | null
  teacherId: string | null
  assistantTeacherId: string | null
  name: string
  room: string | null
  section: string | null
  academicYear: string
  isActive: boolean
  examPeriodT1Open: boolean
  examPeriodT2Open: boolean
  examPeriodT3Open: boolean
  createdAt: Date
  updatedAt: Date
  // Joined from catalog
  subjectCode: string | null
  levelNumber: string | null
  catalogCode: string | null
  curriculum: string | null
  // Joined from teachers
  teacherName: string | null
  assistantTeacherName: string | null
  // Computed
  enrollmentCount: number
  fullCode: string   // e.g. "QRN-402-1"
}

// Student enrolled in a specific class
export type EnrolledStudentInClass = {
  enrollmentId: string
  studentId: string
  firstName: string
  lastName: string
  parentPhone: string | null
  studentCustomId: string | null
  paidT1: boolean
  paidT2: boolean
  paidT3: boolean
  enrolledAt: Date
  unenrolledAt: Date | null
}

// Codes matières disponibles
export const SUBJECT_CODES = ['QRN', 'ARA', 'ISL', 'NUR'] as const
export type SubjectCode = (typeof SUBJECT_CODES)[number] | string

export const SUBJECT_LABELS: Record<string, string> = {
  QRN: 'Quran',
  ARA: 'Arabe',
  ISL: 'Études islamiques',
  NUR: 'Nuraniyah',
}

export const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  QRN: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  ARA: { bg: 'bg-purple-100',  text: 'text-purple-800',  border: 'border-purple-300',  dot: 'bg-purple-500'  },
  ISL: { bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-300',    dot: 'bg-blue-500'    },
  NUR: { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300',  dot: 'bg-orange-500'  },
}

export function getSubjectColor(code: string | null | undefined) {
  return SUBJECT_COLORS[code ?? ''] ?? {
    bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', dot: 'bg-gray-500',
  }
}

export function buildFullCode(catalogCode: string | null | undefined, section: string | null | undefined): string {
  if (!catalogCode && !section) return ''
  if (!catalogCode) return section ?? ''
  if (!section) return catalogCode
  return `${catalogCode}-${section}`
}
