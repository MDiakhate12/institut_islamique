import { pgTable, uuid, text, integer, timestamp, date, pgEnum, boolean } from 'drizzle-orm/pg-core'
import { schools } from './schools'
import { students, classEnrollments } from './academic'
import { schoolMembers } from './auth'

export const paymentStatusEnum = pgEnum('payment_status', ['verified', 'pending', 'rejected'])
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'check', 'paypal', 'venmo', 'no_fees', 'other'])
export const paymentCategoryEnum = pgEnum('payment_category', ['tuition', 'registration', 'donation', 'other'])
export const paymentPeriodEnum = pgEnum('payment_period', ['annually', 'trimester_1', 'trimester_2', 'trimester_3'])
export const expenseStatusEnum = pgEnum('expense_status', ['pending', 'approved', 'paid', 'rejected'])

export const payments = pgTable('payments', {
  id:                uuid('id').primaryKey().defaultRandom(),
  schoolId:          uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  studentId:         uuid('student_id').references(() => students.id),
  classEnrollmentId: uuid('class_enrollment_id').references(() => classEnrollments.id),
  amount:            integer('amount').notNull(),
  currency:          text('currency').notNull().default('EUR'),
  method:            paymentMethodEnum('method').notNull(),
  category:          paymentCategoryEnum('category').notNull(),
  period:            paymentPeriodEnum('period').notNull(),
  financialOption:   text('financial_option'),
  status:            paymentStatusEnum('status').notNull().default('pending'),
  notes:             text('notes'),
  paymentDate:       date('payment_date'),
  submittedBy:       uuid('submitted_by').references(() => schoolMembers.id),
  createdAt:         timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const expenses = pgTable('expenses', {
  id:          uuid('id').primaryKey().defaultRandom(),
  schoolId:    uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  amount:      integer('amount').notNull(),
  currency:    text('currency').notNull().default('EUR'),
  description: text('description').notNull(),
  category:    text('category'),
  status:      expenseStatusEnum('status').notNull().default('pending'),
  receiptUrl:  text('receipt_url'),
  submittedBy: uuid('submitted_by').references(() => schoolMembers.id),
  approvedBy:  uuid('approved_by').references(() => schoolMembers.id),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
