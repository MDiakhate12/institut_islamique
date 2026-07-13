export type ExamResult = {
  id: string
  schoolId: string
  classId: string
  studentId: string
  trimester: number
  academicYear: string | null
  attendance: number | null
  respectTeachers: number | null
  respectOthers: number | null
  bringBooks: number | null
  participation: number | null
  eagerness: number | null
  coveredContent: string | null
  generalComments: string | null
  score: number | null
  parentSignature: string | null
  submittedBy: string | null
  submittedAt: Date
}

export type StudentGradeStatus = {
  studentId: string
  firstName: string
  lastName: string
  studentCustomId: string | null
  isGraded: boolean
  examResultId: string | null
}

export type TeacherExamClass = {
  classId: string
  className: string
  room: string | null
  subjectCode: string | null
  catalogCode: string | null
  totalStudents: number
  gradedCount: number
  students: StudentGradeStatus[]
}

export type AdminExamClassProgress = {
  classId: string
  className: string
  catalogCode: string | null
  subjectCode: string | null
  teacherName: string | null
  totalStudents: number
  gradedCount: number
  pendingCount: number
  signedCount: number
  totalSignable: number
  percentage: number
  pendingStudents: { name: string; customId: string | null }[]
  gradedStudents: { name: string; customId: string | null; isSigned: boolean }[]
}

export type AdminExamStudentProgress = {
  studentId: string
  firstName: string
  lastName: string
  studentCustomId: string | null
  classes: {
    classId: string
    className: string
    classCode: string | null
    isGraded: boolean
    isSigned: boolean
  }[]
  gradedClasses: number
  totalClasses: number
  averageScore: number | null
}

export type ParentChildExamData = {
  studentId: string
  firstName: string
  lastName: string
  studentCustomId: string | null
  grades: ParentExamGrade[]
}

export type ParentExamGrade = {
  classId: string
  className: string
  teacherName: string | null
  examResultId: string
  attendance: number | null
  respectTeachers: number | null
  respectOthers: number | null
  bringBooks: number | null
  participation: number | null
  eagerness: number | null
  coveredContent: string | null
  generalComments: string | null
  score: number | null
  parentSignature: string | null
}

export type GradeFormStudent = {
  studentId: string
  firstName: string
  lastName: string
  studentCustomId: string | null
  classId: string
  className: string
  catalogCode: string | null
  subjectCode: string | null
}
