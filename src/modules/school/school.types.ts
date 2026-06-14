import type { InferSelectModel } from 'drizzle-orm'
import { schools } from '@/db/schema'
export type { SchoolSettings, TvRule, ClassPeriod, QuickLink, StaffMember } from '@/db/schema/schools'

export type School = InferSelectModel<typeof schools>
