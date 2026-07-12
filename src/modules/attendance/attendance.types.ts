export type AttendanceStatus = 'present' | 'late' | 'absent'

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
