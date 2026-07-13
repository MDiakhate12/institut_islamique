export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused'

export type AttendanceStudent = {
  studentId: string
  firstName: string
  lastName: string
  customId: string | null
}

export type PinnedAttendanceClass = {
  pinnedId: string
  classId: string
  catalogCode: string
  subjectCode: string
  name: string
  section: string | null
  teacherName: string | null
}

export type AttendanceClassOption = {
  id: string
  catalogCode: string
  subjectCode: string
  levelNumber: string | null
  name: string
  section: string | null
}

export type SubmitAttendanceInput = {
  classId: string
  date: string
  records: { studentId: string; status: AttendanceStatus }[]
}

export type ExistingAttendance = {
  attendanceId: string
  records: Record<string, AttendanceStatus>
}

// ── Admin types ──────────────────────────────────────────────────────────────

export type AdminClassOverview = {
  classId: string
  name: string
  catalogCode: string
  subjectCode: string
  section: string | null
  room: string | null
  teacherName: string | null
  teacherId: string | null
  studentCount: number
  isSubmitted: boolean
  presentCount: number
  lateCount: number
  absentCount: number
  excusedCount: number
  unmarkedCount: number
}

export type AdminStudentEntry = {
  studentId: string
  firstName: string
  lastName: string
  classId: string
  className: string
  status: AttendanceStatus | null
}

export type AdminDayOverview = {
  totalClasses: number
  submittedCount: number
  missingCount: number
  totalStudents: number
  totalPresent: number
  totalLate: number
  totalAbsent: number
  totalExcused: number
  totalUnmarked: number
  teacherCount: number
  teachersSubmitted: number
  classes: AdminClassOverview[]
  studentEntries: AdminStudentEntry[]
}
