export type HomeworkSurah = {
  name: string
  arabic: string
}

export type HomeworkItem = {
  id: string
  schoolId: string
  classId: string
  title: string
  description: string | null
  assignedDate: string
  // Quran fields
  surahName: string | null
  surahArabic: string | null
  fromVerse: number | null
  toVerse: number | null
  isFullSurah: boolean
  revisionSurahs: HomeworkSurah[]
  // File
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  // Relations
  createdBy: string | null
  createdByName: string | null
  createdAt: Date
}

export type PinnedClass = {
  pinnedId: string
  classId: string
  catalogCode: string
  subjectCode: string
  name: string
  section: string | null
  teacherName: string | null
  homeworkCount: number
}

export type ClassOption = {
  id: string
  catalogCode: string
  subjectCode: string
  levelNumber: string | null
  name: string
  section: string | null
}

export type VirtualSession = {
  id: string
  classId: string
  jitsiRoom: string
  isActive: boolean
  createdByName: string | null
  createdAt: Date
}

export type HomeworkStudent = {
  studentId: string
  firstName: string
  lastName: string
  status: 'pending' | 'submitted'
}

export type ParentChild = {
  studentId: string
  firstName: string
  lastName: string
}

export type ParentHomeworkItem = {
  id: string
  schoolId: string
  classId: string
  className: string
  classCode: string
  classSection: string | null
  subjectCode: string
  assignedDate: string
  surahName: string | null
  surahArabic: string | null
  fromVerse: number | null
  toVerse: number | null
  isFullSurah: boolean
  revisionSurahs: HomeworkSurah[]
  description: string | null
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  teacherName: string | null
  isLatest: boolean
  submissionUrl: string | null
  studentId: string
}
