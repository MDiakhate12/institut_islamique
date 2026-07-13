'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Megaphone, Users, Baby, GraduationCap, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Announcement } from '@/modules/announcements/announcements.types'

// ── Audience badge ─────────────────────────────────────────────────────────────

const AUDIENCE_LABEL: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  everyone: { label: 'Tous',       icon: Users },
  parents:  { label: 'Parents',    icon: Baby },
  teachers: { label: 'Personnel',  icon: GraduationCap },
  admins:   { label: 'Admins',     icon: Users },
}

function AudienceBadge({ audience }: { audience: string }) {
  const cfg = AUDIENCE_LABEL[audience] ?? AUDIENCE_LABEL.everyone
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  announcement: Announcement
  onEdit?: (a: Announcement) => void
  onDelete?: (a: Announcement) => void
}

function AnnouncementCard({ announcement: a, onEdit, onDelete }: CardProps) {
  const isAdmin = !!onEdit
  return (
    <div className="border border-border rounded-xl bg-white overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Megaphone className="h-4 w-4 text-[#c2440f] shrink-0" />
          <h3 className="font-semibold text-[#7a4f30] truncate">{a.title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AudienceBadge audience={a.audience} />
          {isAdmin && (
            <>
              <button onClick={() => onEdit?.(a)}
                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete?.(a)}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 px-5 pb-3 text-xs text-muted-foreground">
        <span>{format(new Date(a.createdAt), 'd MMM yyyy', { locale: fr })}</span>
        {a.createdByName && (
          <span className="flex items-center gap-1">
            <span className="h-3.5 w-3.5 rounded-full border border-border inline-block" />
            {a.createdByName}
          </span>
        )}
      </div>

      {/* Image */}
      {a.imageUrl && (
        <div className="flex justify-center bg-muted/20 px-5 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.imageUrl} alt="" className="max-h-80 object-contain rounded-lg" />
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'px-5 pb-5 text-sm text-gray-800 leading-relaxed',
          '[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4',
          '[&_a]:text-[#c2440f] [&_a]:underline',
          '[&_strong]:font-semibold',
          '[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2',
          '[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1',
          '[&_hr]:border-t [&_hr]:border-gray-200 [&_hr]:my-3',
          '[&_mark]:px-0.5 [&_mark]:rounded-sm',
        )}
        dangerouslySetInnerHTML={{ __html: a.content }}
      />
    </div>
  )
}

// ── Feed ──────────────────────────────────────────────────────────────────────

interface FeedProps {
  announcements: Announcement[]
  onEdit?: (a: Announcement) => void
  onDelete?: (a: Announcement) => void
  emptyMessage?: string
}

export function AnnouncementFeed({ announcements, onEdit, onDelete, emptyMessage }: FeedProps) {
  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-base font-medium text-muted-foreground">Aucune annonce pour l&apos;instant</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {emptyMessage ?? 'Revenez plus tard pour les nouvelles et les mises à jour.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {announcements.map(a => (
        <AnnouncementCard key={a.id} announcement={a} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
