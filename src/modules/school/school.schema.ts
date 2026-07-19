import { z } from 'zod'

// ── School identity / contact ─────────────────────────────────────────────────

export const updateSchoolInfoSchema = z.object({
  name:            z.string().min(1, 'Le nom est requis'),
  defaultLanguage: z.string().default('fr'),
  timezone:        z.string().default('UTC'),
  contactEmail:    z.string().email('Email invalide').optional().or(z.literal('')),
  phone:           z.string().optional(),
  address:         z.string().optional(),
  website:         z.string().optional(),
  facebook:        z.string().optional(),
  instagram:       z.string().optional(),
})
export type UpdateSchoolInfoInput = z.infer<typeof updateSchoolInfoSchema>

// ── School settings (JSONB) ───────────────────────────────────────────────────

export const staffMemberSchema = z.object({
  id:   z.string(),
  name: z.string(),
  role: z.string(),
})

export const tvRuleSchema = z.object({
  id:          z.string(),
  emoji:       z.string(),
  title:       z.string(),
  description: z.string(),
})

export const classPeriodSchema = z.object({
  id:        z.string(),
  name:      z.string(),
  startTime: z.string(),
  endTime:   z.string(),
})

export const quickLinkSchema = z.object({
  id:    z.string(),
  label: z.string(),
  url:   z.string(),
})

export const updateSchoolSettingsSchema = z.object({
  schoolDays:             z.array(z.string()).optional(),
  academicYear:           z.string().optional(),
  currentTrimester:       z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  allowNewRegistrations:  z.boolean().optional(),
  examPeriodT1Open:       z.boolean().optional(),
  examPeriodT2Open:       z.boolean().optional(),
  examPeriodT3Open:       z.boolean().optional(),
  yearStartDate:          z.string().nullable().optional(),
  yearEndDate:            z.string().nullable().optional(),
  trimester1StartDate:    z.string().nullable().optional(),
  trimester2StartDate:    z.string().nullable().optional(),
  trimester3StartDate:    z.string().nullable().optional(),
  rooms:                  z.array(z.string()).optional(),
  classPeriods:           z.array(classPeriodSchema).optional(),
  gradeLevels:            z.array(z.string()).optional(),
  teacherHourlyRate:      z.number().min(0).optional(),
  paymentInfoUrl:         z.string().optional(),
  paymentModes:           z.array(z.string()).optional(),
  financialOptions:       z.array(z.string()).optional(),
  allowTeacherExpenses:   z.boolean().optional(),
  requireQuranRecording:  z.boolean().optional(),
  tvRules:                z.array(tvRuleSchema).optional(),
  staff:                  z.array(staffMemberSchema).optional(),
  quickLinks:             z.array(quickLinkSchema).optional(),
})
export type UpdateSchoolSettingsInput = z.infer<typeof updateSchoolSettingsSchema>
