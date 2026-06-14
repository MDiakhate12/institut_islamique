'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useSendReminder } from '@/modules/calendar/calendar.hooks'
import { EVENT_TYPE_CONFIG } from '@/modules/calendar/calendar.types'
import type { AcademicEvent } from '@/modules/calendar/calendar.types'
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Bell, Calendar, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  event: AcademicEvent | null
  onClose: () => void
  onEdit: (event: AcademicEvent) => void
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const suffix = hour >= 12 ? 'AM' : 'AM'
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

export function EventDetailDialog({ event, onClose, onEdit }: Props) {
  const reminder = useSendReminder()

  if (!event) return null

  const cfg = EVENT_TYPE_CONFIG[event.type as keyof typeof EVENT_TYPE_CONFIG]
    ?? EVENT_TYPE_CONFIG.other

  const dateStr = (() => {
    try {
      return format(parseISO(event.startDate), 'EEEE, MMMM d, yyyy', { locale: fr })
        .replace(/^\w/, (c: string) => c.toUpperCase())
    } catch { return event.startDate }
  })()

  const timeStr = event.isAllDay
    ? 'All day'
    : event.startTime && event.endTime
      ? `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`
      : event.startTime
        ? formatTime(event.startTime)
        : 'All day'

  return (
    <Dialog open={!!event} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm" showCloseButton={false}>
        {/* Custom close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon circle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className={cn(
            'h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm',
            cfg.bg, 'border', cfg.border
          )}>
            {cfg.emoji}
          </div>
        </div>

        {/* Type badge */}
        <div className="text-center">
          <span className={cn(
            'text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded',
            cfg.color, cfg.bg
          )}>
            {cfg.label}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center text-foreground">
          {event.title}
        </h2>

        {/* Date */}
        <div className="rounded-xl border border-border px-4 py-3 flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date</p>
            <p className="text-sm font-medium">{dateStr}</p>
          </div>
        </div>

        {/* Time */}
        <div className="rounded-xl border border-border px-4 py-3 flex items-center gap-3">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Time</p>
            <p className="text-sm font-medium">{timeStr}</p>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="rounded-xl border border-border px-4 py-3 flex items-center gap-3">
            <span className="text-sm">📍</span>
            <p className="text-sm">{event.location}</p>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-sm text-muted-foreground px-1">{event.description}</p>
        )}

        {/* Send reminder */}
        <Button
          onClick={() => reminder.mutate(event.id)}
          disabled={reminder.isPending}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white gap-2"
        >
          <Bell className="h-4 w-4" />
          {reminder.isPending ? 'Envoi...' : 'Send Reminder to Everyone'}
        </Button>

        {/* Footer */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button
            className="flex-1 bg-foreground text-background hover:bg-foreground/90"
            onClick={() => { onClose(); onEdit(event) }}
          >
            Edit Event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
