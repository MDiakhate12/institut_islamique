import {
  pgTable, uuid, text, boolean, timestamp, date, pgEnum, primaryKey,
} from 'drizzle-orm/pg-core'
import { schools } from './schools'
import { schoolMembers } from './auth'

export const genderEnum = pgEnum('gender', ['male', 'female'])
export const guardianRelationshipEnum = pgEnum('guardian_relationship', ['father', 'mother', 'guardian', 'other'])

// Catalogue global — 36 modèles, sans school_id
export const classCatalog = pgTable('class_catalog', {
  id:           uuid('id').primaryKey().defaultRandom(),
  code:         text('code').notNull().unique(),
  subjectCode:  text('subject_code').notNull(),
  levelNumber:  text('level_number'),
  name:         text('name').notNull(),
  nextClassId:  uuid('next_class_id'),
  curriculum:   text('curriculum'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const students = pgTable('students', {
  id:               uuid('id').primaryKey().defaultRandom(),
  schoolId:         uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  firstName:        text('first_name').notNull(),
  lastName:         text('last_name').notNull(),
  birthDate:        date('birth_date'),
  gender:           genderEnum('gender').notNull(),
  profilePhotoUrl:  text('profile_photo_url'),
  notes:            text('notes'),
  isActive:         boolean('is_active').notNull().default(true),
  studentCustomId:  text('student_custom_id'),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy:        uuid('created_by').references(() => schoolMembers.id),
})

// Contacts familiaux normalisés — remplace les champs parentName/Email/Phone dans students
export const guardians = pgTable('guardians', {
  id:             uuid('id').primaryKey().defaultRandom(),
  schoolId:       uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId:      uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  relationship:   guardianRelationshipEnum('relationship').notNull().default('guardian'),
  firstName:      text('first_name').notNull(),
  lastName:       text('last_name').notNull().default(''),
  email:          text('email'),
  phone:          text('phone'),
  emergencyPhone: text('emergency_phone'),
  isPrimary:      boolean('is_primary').notNull().default(false),
  linkedMemberId: uuid('linked_member_id').references(() => schoolMembers.id),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Lien parent (utilisateur de l'app) ↔ élève — schoolMemberId remplace parentUserId
export const parentStudents = pgTable('parent_students', {
  schoolMemberId: uuid('school_member_id').notNull().references(() => schoolMembers.id, { onDelete: 'cascade' }),
  studentId:      uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  schoolId:       uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.schoolMemberId, t.studentId] })])

export const classes = pgTable('classes', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  schoolId:           uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  catalogClassId:     uuid('catalog_class_id').references(() => classCatalog.id),
  teacherId:          uuid('teacher_id').references(() => schoolMembers.id),
  assistantTeacherId: uuid('assistant_teacher_id').references(() => schoolMembers.id),
  name:               text('name').notNull(),
  room:               text('room'),
  section:            text('section'),
  academicYear:       text('academic_year').notNull(),
  isActive:           boolean('is_active').notNull().default(true),
  examPeriodT1Open:   boolean('exam_period_t1_open').notNull().default(false),
  examPeriodT2Open:   boolean('exam_period_t2_open').notNull().default(false),
  examPeriodT3Open:   boolean('exam_period_t3_open').notNull().default(false),
  createdAt:          timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:          timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const classEnrollments = pgTable('class_enrollments', {
  id:           uuid('id').primaryKey().defaultRandom(),
  classId:      uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  studentId:    uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  schoolId:     uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  enrolledAt:   timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  unenrolledAt: timestamp('unenrolled_at', { withTimezone: true }),
})
