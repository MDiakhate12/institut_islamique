import {
  pgTable, uuid, text, boolean, timestamp, date, jsonb, integer, pgEnum,
} from 'drizzle-orm/pg-core'
import { schools } from './schools'
import { students, classes } from './academic'
import { schoolMembers } from './auth'

export const substitutionStatusEnum = pgEnum('substitution_status', ['open', 'active', 'completed'])
export const eventTypeEnum = pgEnum('academic_event_type', [
  'exam', 'meeting', 'fun_event', 'holiday', 'open_house',
  'ceremony', 'beginning', 'closed', 'lecture', 'event', 'other',
])
export const registrationStatusEnum = pgEnum('registration_status', ['pending', 'approved', 'rejected'])

export const substitutions = pgTable('substitutions', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  schoolId:             uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId:              uuid('class_id').references(() => classes.id),
  requestingTeacherId:  uuid('requesting_teacher_id').references(() => schoolMembers.id),
  substituteId:         uuid('substitute_id').references(() => schoolMembers.id),
  date:                 date('date').notNull(),
  status:               substitutionStatusEnum('status').notNull().default('open'),
  notes:                text('notes'),
  createdAt:            timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const bookTracking = pgTable('book_tracking', {
  id:            uuid('id').primaryKey().defaultRandom(),
  schoolId:      uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  classId:       uuid('class_id').references(() => classes.id),
  studentId:     uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  bookName:      text('book_name').notNull(),
  academicYear:  text('academic_year').notNull(),
  distributedAt: timestamp('distributed_at', { withTimezone: true }),
  returnedAt:    timestamp('returned_at', { withTimezone: true }),
  notes:         text('notes'),
})

export const academicEvents = pgTable('academic_events', {
  id:          uuid('id').primaryKey().defaultRandom(),
  schoolId:    uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  description: text('description'),
  type:        eventTypeEnum('type').notNull().default('event'),
  startDate:   date('start_date').notNull(),
  endDate:     date('end_date'),
  startTime:   text('start_time'),
  endTime:     text('end_time'),
  isAllDay:    boolean('is_all_day').notNull().default(true),
  location:    text('location'),
  isHidden:    boolean('is_hidden').notNull().default(false),
  createdBy:   uuid('created_by').references(() => schoolMembers.id),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const registrationForms = pgTable('registration_forms', {
  id:         uuid('id').primaryKey().defaultRandom(),
  schoolId:   uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  formType:   text('form_type').notNull(),
  formSchema: jsonb('form_schema').notNull().default([]),
  isActive:   boolean('is_active').notNull().default(true),
  version:    integer('version').notNull().default(1),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const registrations = pgTable('registrations', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  schoolId:              uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  formId:                uuid('form_id').references(() => registrationForms.id),
  studentId:             uuid('student_id').references(() => students.id),
  submittedByMemberId:   uuid('submitted_by_member_id').references(() => schoolMembers.id),
  academicYear:          text('academic_year').notNull().default(''),
  formData:              jsonb('form_data').notNull().default({}),
  status:                registrationStatusEnum('status').notNull().default('pending'),
  submittedAt:           timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedBy:            uuid('reviewed_by').references(() => schoolMembers.id),
  reviewedAt:            timestamp('reviewed_at', { withTimezone: true }),
  notes:                 text('notes'),
})

// Sélections de classes normalisées (remplace le JSONB dans registrations.formData)
export const registrationClassSelections = pgTable('registration_class_selections', {
  id:             uuid('id').primaryKey().defaultRandom(),
  registrationId: uuid('registration_id').notNull().references(() => registrations.id, { onDelete: 'cascade' }),
  classId:        uuid('class_id').references(() => classes.id),
  subjectCode:    text('subject_code'),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const otpCodes = pgTable('otp_codes', {
  id:        uuid('id').primaryKey().defaultRandom(),
  phone:     text('phone').notNull(),
  code:      text('code').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt:    timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const stickyNotes = pgTable('sticky_notes', {
  id:        uuid('id').primaryKey().defaultRandom(),
  schoolId:  uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').notNull(),
  content:   text('content').notNull(),
  color:     text('color').default('#fdf6f0'),
  positionX: integer('position_x').default(0),
  positionY: integer('position_y').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
