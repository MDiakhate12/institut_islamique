import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

// ── Settings type ─────────────────────────────────────────────────────────────

export type TvRule = {
  id: string
  emoji: string
  title: string
  description: string
}

export type ClassPeriod = {
  id: string
  name: string       // "8h30 - 9h30"
  startTime: string  // "08:30"
  endTime: string    // "09:30"
}

export type QuickLink = {
  id: string
  label: string
  url: string
}

export type StaffMember = {
  id: string
  name: string
  role: string
}

export type SchoolSettings = {
  // ── Opérations scolaires
  schoolDays: string[]           // ['sunday', 'monday', ...]
  academicYear: string           // '2025-2026'
  currentTrimester: 1 | 2 | 3
  allowNewRegistrations: boolean
  examPeriodT1Open: boolean
  examPeriodT2Open: boolean
  examPeriodT3Open: boolean

  // ── Calendrier
  yearStartDate: string | null
  yearEndDate: string | null
  trimester1StartDate: string | null
  trimester2StartDate: string | null
  trimester3StartDate: string | null

  // ── Infrastructure
  rooms: string[]                // ['Room 1', 'Room 2', ...]
  classPeriods: ClassPeriod[]    // Emploi du temps quotidien
  gradeLevels: string[]          // ['Pré-maternelle', '1re année', ...]

  // ── Finance
  teacherHourlyRate: number      // taux horaire enseignants payés (€)
  paymentInfoUrl: string         // lien infos paiement
  paymentModes: string[]         // ['Venmo', 'Cash', 'Check', 'PayPal', 'No Fees']
  financialOptions: string[]     // ['No, thank you!', 'Supply 100% waived', ...]

  // ── Soumissions
  allowTeacherExpenses: boolean  // enseignants peuvent demander remboursements
  requireQuranRecording: boolean // parents doivent soumettre audio Coran

  // ── TV Settings
  tvRules: TvRule[]

  // ── Staff (direction + rôles non-enseignants)
  staff: StaffMember[]

  // ── Liens rapides sidebar
  quickLinks: QuickLink[]
}

export const DEFAULT_SETTINGS: SchoolSettings = {
  schoolDays:              ['sunday', 'saturday'],
  academicYear:            '2025-2026',
  currentTrimester:        1,
  allowNewRegistrations:   true,
  examPeriodT1Open:        false,
  examPeriodT2Open:        false,
  examPeriodT3Open:        false,
  yearStartDate:           null,
  yearEndDate:             null,
  trimester1StartDate:     null,
  trimester2StartDate:     null,
  trimester3StartDate:     null,
  rooms:                   [],
  classPeriods:            [],
  gradeLevels:             [],
  teacherHourlyRate:       0,
  paymentInfoUrl:          '',
  paymentModes:            ['Cash', 'Check', 'PayPal', 'Venmo', 'No Fees'],
  financialOptions:        [],
  allowTeacherExpenses:    true,
  requireQuranRecording:   false,
  tvRules:                 [],
  staff:                   [],
  quickLinks:              [],
}

// ── Schools table ─────────────────────────────────────────────────────────────

export const schools = pgTable('schools', {
  id:              uuid('id').primaryKey().defaultRandom(),
  name:            text('name').notNull(),
  slug:            text('slug').notNull().unique(),
  logoUrl:         text('logo_url'),

  // Identité / Contact
  contactEmail:    text('contact_email'),
  phone:           text('phone'),
  address:         text('address'),
  website:         text('website'),
  facebook:        text('facebook'),
  instagram:       text('instagram'),
  defaultLanguage: text('default_language').default('fr'),
  timezone:        text('timezone').default('UTC'),

  // JSONB settings
  settings: jsonb('settings')
    .$type<SchoolSettings>()
    .default(DEFAULT_SETTINGS),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
