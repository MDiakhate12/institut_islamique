import {
  pgTable, uuid, text, boolean, timestamp, date, pgEnum, primaryKey,
} from 'drizzle-orm/pg-core'
import { schools } from './schools'
import { schoolMembers } from './auth'

export const genderEnum = pgEnum('gender', ['male', 'female'])

// Catalogue global — 36 modèles, sans school_id
// subjectCode : 'QRN' | 'ARA' | 'ISL' | 'NUR' | custom
// levelNumber : '100', '101', '201' … (texte pour flexibilité)
// code        : composite unique ex. 'QRN-100'
export const classCatalog = pgTable('class_catalog', {
  id:           uuid('id').primaryKey().defaultRandom(),
  code:         text('code').notNull().unique(),   // 'QRN-100'
  subjectCode:  text('subject_code').notNull(),    // 'QRN', 'ARA', 'ISL', 'NUR'…
  levelNumber:  text('level_number'),              // '100', '101'…
  name:         text('name').notNull(),            // nom complet affiché
  nextClassId:  uuid('next_class_id'),             // self-ref géré en app layer
  curriculum:   text('curriculum'),                // HTML riche du programme
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  birthDate: date('birth_date'),
  gender: genderEnum('gender').notNull(),
  profilePhotoUrl: text('profile_photo_url'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  // Informations famille
  parentPhone:   text('parent_phone'),
  parentName1:   text('parent_name_1'),
  parentName2:   text('parent_name_2'),
  parentEmail1:  text('parent_email_1'),
  parentEmail2:  text('parent_email_2'),
  emergencyPhone: text('emergency_phone'),
  // ID élève affiché (ex : 625432895-1)
  studentCustomId: text('student_custom_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
})

export const parentStudents = pgTable('parent_students', {
  parentUserId: uuid('parent_user_id').notNull(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.parentUserId, t.studentId] })])

export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  catalogClassId: uuid('catalog_class_id').references(() => classCatalog.id),
  teacherId: uuid('teacher_id').references(() => schoolMembers.id),
  assistantTeacherId: uuid('assistant_teacher_id').references(() => schoolMembers.id),
  name: text('name').notNull(),
  room: text('room'),
  section: text('section'),
  academicYear: text('academic_year').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  // Période d'examens par trimestre (fix du bug "global switch")
  examPeriodT1Open: boolean('exam_period_t1_open').notNull().default(false),
  examPeriodT2Open: boolean('exam_period_t2_open').notNull().default(false),
  examPeriodT3Open: boolean('exam_period_t3_open').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const classEnrollments = pgTable('class_enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  unenrolledAt: timestamp('unenrolled_at', { withTimezone: true }),
  // Statut de paiement par trimestre
  paidT1: boolean('paid_t1').notNull().default(false),
  paidT2: boolean('paid_t2').notNull().default(false),
  paidT3: boolean('paid_t3').notNull().default(false),
})
