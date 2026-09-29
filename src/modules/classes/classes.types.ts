// Type for a scheduled class with all joined details
export type ClassWithDetails = {
  id: string
  schoolId: string
  teacherId: string | null
  assistantTeacherId: string | null
  subject: string
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
  // Joined from teachers
  teacherName: string | null
  assistantTeacherName: string | null
  // Computed
  enrollmentCount: number
  fullCode: string        // e.g. "QRN-1"
  subjectCode: string     // alias for subject (backward-compat)
}

// Student enrolled in a specific class
export type EnrolledStudentInClass = {
  enrollmentId: string
  studentId: string
  firstName: string
  lastName: string
  studentCustomId: string | null
  enrolledAt: Date
  unenrolledAt: Date | null
}

// Codes matières disponibles (par école — extensible)
export const SUBJECT_CODES = ['QRN', 'ARA', 'ISL', 'NUR', 'TAF', 'HAD', 'LIV'] as const
export type SubjectCode = (typeof SUBJECT_CODES)[number] | string

export const SUBJECT_LABELS: Record<string, string> = {
  QRN: 'Coran',
  ARA: 'Arabe',
  ISL: 'Études islamiques',
  NUR: 'Nuraniyah',
  TAF: 'Tafsir',
  HAD: 'Hadith',
  LIV: 'Livre',
}

export const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  QRN: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  ARA: { bg: 'bg-purple-100',  text: 'text-purple-800',  border: 'border-purple-300',  dot: 'bg-purple-500'  },
  ISL: { bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-300',    dot: 'bg-blue-500'    },
  NUR: { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300',  dot: 'bg-orange-500'  },
  TAF: { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-300',   dot: 'bg-amber-500'   },
  HAD: { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-300',    dot: 'bg-rose-500'    },
  LIV: { bg: 'bg-sky-100',     text: 'text-sky-800',     border: 'border-sky-300',     dot: 'bg-sky-500'     },
}

export function getSubjectColor(code: string | null | undefined) {
  return SUBJECT_COLORS[code ?? ''] ?? {
    bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', dot: 'bg-gray-500',
  }
}

export function buildFullCode(subject: string | null | undefined, section: string | null | undefined): string {
  if (!subject && !section) return ''
  if (!subject) return section ?? ''
  if (!section) return subject
  return `${subject}-${section}`
}
