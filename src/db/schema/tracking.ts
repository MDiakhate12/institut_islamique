import {
  pgTable, uuid, text, integer, timestamp, date, pgEnum, boolean, jsonb,
} from 'drizzle-orm/pg-core'
import { schools } from './schools'
import { students } from './academic'
import { classes } from './academic'
import { schoolMembers } from './auth'

export const attendanceStatusEnum = pgEnum('attendance_status', [
  'present', 'absent', 'late', 'excused',
])

export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  submittedBy: uuid('submitted_by').references(() => schoolMembers.id),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  attendanceId: uuid('attendance_id').notNull().references(() => attendance.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  status: attendanceStatusEnum('status').notNull().default('present'),
  note: text('note'),
})

export const homework = pgTable('homework', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  assignedDate: date('assigned_date').notNull(),
  // Quran-specific fields
  surahName: text('surah_name'),
  surahArabic: text('surah_arabic'),
  fromVerse: integer('from_verse'),
  toVerse: integer('to_verse'),
  isFullSurah: boolean('is_full_surah').default(false),
  revisionSurahs: jsonb('revision_surahs').$type<{ name: string; arabic: string }[]>().default([]),
  // File attachment
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  createdBy: uuid('created_by').references(() => schoolMembers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const homeworkGrades = pgTable('homework_grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  homeworkId: uuid('homework_id').notNull().references(() => homework.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  stars: integer('stars').notNull(),
  note: text('note'),
  gradedBy: uuid('graded_by').references(() => schoolMembers.id),
  gradedAt: timestamp('graded_at', { withTimezone: true }).defaultNow().notNull(),
})

export const examResults = pgTable('exam_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  trimester: integer('trimester').notNull(),
  academicYear: text('academic_year'),
  // Star ratings (1-5)
  attendance: integer('attendance'),
  respectTeachers: integer('respect_teachers'),
  respectOthers: integer('respect_others'),
  bringBooks: integer('bring_books'),
  participation: integer('participation'),
  eagerness: integer('eagerness'),
  // Text feedback
  coveredContent: text('covered_content'),
  generalComments: text('general_comments'),
  // Exam score (0-100)
  score: integer('score'),
  // Parent signature
  parentSignature: text('parent_signature'),
  submittedBy: uuid('submitted_by').references(() => schoolMembers.id),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
})

export const virtualSessions = pgTable('virtual_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => schoolMembers.id),
  jitsiRoom: text('jitsi_room').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
})

export const homeworkSubmissions = pgTable('homework_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  homeworkId: uuid('homework_id').notNull().references(() => homework.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  recordingUrl: text('recording_url').notNull(),
  durationSeconds: integer('duration_seconds'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
})

export const teacherHomeworkClasses = pgTable('teacher_homework_classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  schoolMemberId: uuid('school_member_id').notNull().references(() => schoolMembers.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const teacherMyClasses = pgTable('teacher_my_classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  schoolMemberId: uuid('school_member_id').notNull().references(() => schoolMembers.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const teacherAttendanceClasses = pgTable('teacher_attendance_classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  schoolMemberId: uuid('school_member_id').notNull().references(() => schoolMembers.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
