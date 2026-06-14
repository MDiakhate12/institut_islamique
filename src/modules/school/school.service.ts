import { db } from '@/db'
import { schools } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { DEFAULT_SETTINGS } from '@/db/schema/schools'
import type { School, SchoolSettings } from './school.types'
import type { UpdateSchoolInfoInput, UpdateSchoolSettingsInput } from './school.schema'

export const schoolService = {
  // READ
  async getById(schoolId: string): Promise<School | null> {
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1)

    if (!school) return null

    // Merge stored settings with defaults so all fields are always present
    const merged: SchoolSettings = {
      ...DEFAULT_SETTINGS,
      ...(school.settings as SchoolSettings ?? {}),
    }
    return { ...school, settings: merged }
  },

  // UPDATE identity / contact fields
  async updateInfo(schoolId: string, data: UpdateSchoolInfoInput): Promise<School> {
    const [updated] = await db
      .update(schools)
      .set({
        name:            data.name,
        defaultLanguage: data.defaultLanguage ?? 'fr',
        timezone:        data.timezone ?? 'UTC',
        contactEmail:    data.contactEmail || null,
        phone:           data.phone || null,
        address:         data.address || null,
        website:         data.website || null,
        facebook:        data.facebook || null,
        instagram:       data.instagram || null,
        updatedAt:       new Date(),
      })
      .where(eq(schools.id, schoolId))
      .returning()

    return updated
  },

  // UPDATE JSONB settings (partial merge)
  async updateSettings(schoolId: string, patch: UpdateSchoolSettingsInput): Promise<School> {
    const current = await schoolService.getById(schoolId)
    const currentSettings: SchoolSettings = current?.settings ?? { ...DEFAULT_SETTINGS }

    const merged: SchoolSettings = {
      ...currentSettings,
      ...patch,
    }

    const [updated] = await db
      .update(schools)
      .set({ settings: merged, updatedAt: new Date() })
      .where(eq(schools.id, schoolId))
      .returning()

    return { ...updated, settings: merged }
  },

  // UPDATE logo URL
  async updateLogoUrl(schoolId: string, logoUrl: string): Promise<void> {
    await db
      .update(schools)
      .set({ logoUrl, updatedAt: new Date() })
      .where(eq(schools.id, schoolId))
  },
}
