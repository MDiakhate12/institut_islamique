import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  settings: jsonb('settings').$type<{
    schoolDays: string[]
    academicYear: string
    currentTrimester: 1 | 2 | 3
    allowNewRegistrations: boolean
    examPeriodOpen: boolean
    yearStartDate: string | null
    yearEndDate: string | null
  }>().default({
    schoolDays: [],
    academicYear: '2025-2026',
    currentTrimester: 1,
    allowNewRegistrations: true,
    examPeriodOpen: false,
    yearStartDate: null,
    yearEndDate: null,
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
