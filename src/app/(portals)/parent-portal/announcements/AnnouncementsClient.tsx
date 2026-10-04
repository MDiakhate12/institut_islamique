'use client'

import { Megaphone } from 'lucide-react'
import { useAnnouncements } from '@/modules/announcements/announcements.hooks'
import { AnnouncementFeed } from '@/components/shared/AnnouncementFeed'
import { PageLoader } from '@/components/shared/Loader/PageLoader'

export function ParentAnnouncementsClient() {
  const { data: announcements = [], isLoading } = useAnnouncements('parents')

  if (isLoading) return <PageLoader />

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-[#f4f9f3] border border-[#cde6c8] flex items-center justify-center">
          <Megaphone className="h-4.5 w-4.5 text-[#2d6a4f]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#2d6a4f]">Annonces</h1>
          <p className="text-sm text-muted-foreground">Actualités de votre école</p>
        </div>
      </div>

      <AnnouncementFeed announcements={announcements} />
    </div>
  )
}
