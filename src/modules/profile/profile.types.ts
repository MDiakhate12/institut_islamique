import type { PortalRole } from '@/lib/constants'

export type ProfileData = {
  userId: string
  memberId: string
  email: string
  fullName: string | null
  phone: string | null
  avatarUrl: string | null
  preferredLanguage: string | null
  geminiApiKey: string | null
  schoolName: string
  roles: PortalRole[]
  memberSince: Date
}

export const APP_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
  { value: 'fr', label: 'Français' },
  { value: 'so', label: 'Soomaali' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'de', label: 'Deutsch' },
] as const
