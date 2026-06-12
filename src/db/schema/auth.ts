import { pgTable, uuid, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { schools } from './schools'

export const adminSubRoleEnum = pgEnum('admin_sub_role', ['admin', 'treasurer', 'manager'])

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  fullName: text('full_name'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  preferredLanguage: text('preferred_language').default('fr'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const schoolMembers = pgTable('school_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  // Rôles cumulables stockés en tableau JSON
  portalRoles: text('portal_roles').array().notNull().default(['admin']),
  adminSubRole: adminSubRoleEnum('admin_sub_role'),
  isPending: boolean('is_pending').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
})
