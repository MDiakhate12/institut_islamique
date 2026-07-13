import { pgTable, uuid, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { schools } from './schools'
import { schoolMembers } from './auth'

export const audienceEnum = pgEnum('announcement_audience', ['everyone', 'parents', 'teachers', 'admins'])

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  // null pour les annonces globales de l'équipe Qaf
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  audience: audienceEnum('audience').notNull().default('everyone'),
  imageUrl: text('image_url'),
  isGlobal: boolean('is_global').notNull().default(false),
  createdBy: uuid('created_by').references(() => schoolMembers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
