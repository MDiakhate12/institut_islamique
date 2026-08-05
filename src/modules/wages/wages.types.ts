export type WageEntry = {
  id: string
  schoolId: string
  teacherId: string
  teacherName: string
  classId: string | null
  className: string | null
  classCode: string | null
  date: string
  hoursWorked: number
  hourlyRateCents: number
  amountCents: number
  status: string
}

export type WageTimesheetRow = {
  teacherId: string
  teacherName: string
  entriesByDate: Record<string, WageEntry[]>
  totalHours: number
  totalAmountCents: number
}

export type WageTimesheet = {
  rows: WageTimesheetRow[]
  dates: string[]
  totalHours: number
  totalAmountCents: number
  teacherCount: number
  sessionCount: number
}

export type WageKpis = {
  approved: number
  pending: number
  paid: number
}

export type TeacherOption = {
  id: string
  name: string
}

export type TeacherClassOption = {
  id: string
  name: string
  classCode: string | null
}
