'use client'

import { Megaphone } from 'lucide-react'
import { useAnnouncements } from '@/modules/announcements/announcements.hooks'
import { AnnouncementFeed } from '@/components/shared/AnnouncementFeed'

export function TeacherAnnouncementsClient() {
  const { data: announcements = [], isLoading } = useAnnouncements('teachers')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-[#fdf6f0] border border-[#f0dcc8] flex items-center justify-center">
          <Megaphone className="h-4.5 w-4.5 text-[#c2440f]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#7a4f30]">Annonces</h1>
          <p className="text-sm text-muted-foreground">Communications de l&apos;administration</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-40 rounded-xl border border-border bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <AnnouncementFeed
          announcements={announcements}
          emptyMessage="Aucune annonce pour le personnel pour l'instant."
        />
      )}
    </div>
  )
}
