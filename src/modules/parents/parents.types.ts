export type Guardian = {
  id: string
  relationship: string
  firstName: string | null
  lastName: string
  email: string | null
  phone: string | null
  isPrimary: boolean
}

export type ConnectedParent = {
  schoolMemberId: string
  fullName: string | null
}

export type StudentParentInfo = {
  id: string
  firstName: string
  lastName: string
  guardians: Guardian[]
  connectedParents: ConnectedParent[]
}

export type EnrolledClass = {
  classId: string
  className: string
  room: string | null
  section: string | null
  subjectCode: string | null
  levelNumber: string | null
  teacherName: string | null
}

export type ChildWithClasses = {
  studentId: string
  firstName: string
  lastName: string
  studentCustomId: string | null
  classes: EnrolledClass[]
}
