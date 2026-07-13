import type { AnnouncementAudience } from '@/lib/constants'

export type Announcement = {
  id: string
  schoolId: string | null
  title: string
  content: string
  audience: AnnouncementAudience
  imageUrl: string | null
  isGlobal: boolean
  createdBy: string | null
  createdByName: string | null
  createdAt: Date
  updatedAt: Date
}
