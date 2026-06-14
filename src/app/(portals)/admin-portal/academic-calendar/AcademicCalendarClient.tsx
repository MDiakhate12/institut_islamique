'use client'

import { useState, useCallback, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import {
  format, parse, startOfWeek, getDay,
  parseISO, startOfDay, endOfDay, addHours,
  isSameMonth, formatISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEvents } from '@/modules/calendar/calendar.hooks'
import { EVENT_TYPE_CONFIG, EVENT_TYPES } from '@/modules/calendar/calendar.types'
import type { AcademicEvent, EventType, CalendarEvent } from '@/modules/calendar/calendar.types'
import { EventFormDialog } from './EventFormDialog'
import { EventDetailDialog } from './EventDetailDialog'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft, ChevronRight, Plus, List, CalendarDays,
  CalendarRange, Eye, Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendar.css'

// ── react-big-calendar setup ──────────────────────────────────────────────────
const locales = { fr }
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay, locales,
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function eventToCalendar(e: AcademicEvent): CalendarEvent {
  const startDate = parseISO(e.startDate)
  let start: Date
  let end: Date

  if (e.isAllDay || !e.startTime) {
    start = startOfDay(startDate)
    end = e.endDate ? endOfDay(parseISO(e.endDate)) : endOfDay(startDate)
  } else {
    const [sh, sm] = e.startTime.split(':').map(Number)
    start = new Date(startDate)
    start.setHours(sh, sm, 0, 0)

    if (e.endTime) {
      const [eh, em] = e.endTime.split(':').map(Number)
      end = new Date(startDate)
      end.setHours(eh, em, 0, 0)
    } else {
      end = addHours(start, 1)
    }
  }

  return { id: e.id, title: e.title, start, end, allDay: e.isAllDay, resource: e }
}

function formatTimeDisplay(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')}${suffix}`
}

type ViewMode = 'month' | 'week' | 'day' | 'agenda'

const VIEW_LABELS: Record<ViewMode, string> = {
  month: 'Mois', week: 'Semaine', day: 'Jour', agenda: 'Liste',
}

const VIEW_ICONS: Record<ViewMode, React.ElementType> = {
  agenda: List,
  month:  CalendarDays,
  week:   CalendarRange,
  day:    Eye,
}

// ── DAY names for list filter ─────────────────────────────────────────────────
const LIST_DAYS = [
  { key: 0, label: 'dim.' },
  { key: 1, label: 'lun.' },
  { key: 2, label: 'mar.' },
  { key: 3, label: 'mer.' },
  { key: 4, label: 'jeu.' },
  { key: 5, label: 'ven.' },
  { key: 6, label: 'sam.' },
]

// ══════════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════════
export function AcademicCalendarClient() {
  const [view, setView]             = useState<ViewMode>('month')
  const [date, setDate]             = useState(new Date())
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all')
  const [filterOpen, setFilterOpen] = useState(false)

  // Dialogs
  const [formOpen, setFormOpen]         = useState(false)
  const [editEvent, setEditEvent]       = useState<AcademicEvent | undefined>()
  const [detailEvent, setDetailEvent]   = useState<AcademicEvent | null>(null)
  const [defaultDate, setDefaultDate]   = useState<string | undefined>()

  // List-view specific filters
  const [showEmpty, setShowEmpty]       = useState(false)
  const [showPast, setShowPast]         = useState(false)
  const [activeDays, setActiveDays]     = useState<number[]>([0, 1, 2, 3, 4, 5, 6])

  // Fetch all events
  const { data: events = [], isLoading } = useEvents(
    typeFilter !== 'all' ? { type: typeFilter } : undefined
  )

  // Convert to CalendarEvent
  const calendarEvents = useMemo<CalendarEvent[]>(
    () => events.map(eventToCalendar),
    [events]
  )

  // ── Custom event renderer (month pills / week blocks) ──────────────────────
  const EventComponent = useCallback(({ event }: { event: CalendarEvent }) => {
    const cfg = EVENT_TYPE_CONFIG[event.resource.type as EventType] ?? EVENT_TYPE_CONFIG.other
    return (
      <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium truncate', cfg.pillBg, cfg.pillText)}>
        <span className="shrink-0 text-[10px]">{cfg.emoji}</span>
        <span className="truncate">{event.title}</span>
      </div>
    )
  }, [])

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const navigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') { setDate(new Date()); return }
    const d = new Date(date)
    if (view === 'month') {
      d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1))
    } else if (view === 'week') {
      d.setDate(d.getDate() + (direction === 'next' ? 7 : -7))
    } else if (view === 'day') {
      d.setDate(d.getDate() + (direction === 'next' ? 1 : -1))
    } else {
      d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setDate(d)
  }

  const dateLabel = (() => {
    if (view === 'month')  return format(date, 'MMMM yyyy', { locale: fr }).replace(/^\w/, (c: string) => c.toUpperCase())
    if (view === 'day')    return format(date, 'EEEE MMM d', { locale: fr }).replace(/^\w/, (c: string) => c.toUpperCase())
    if (view === 'week') {
      const start = startOfWeek(date, { weekStartsOn: 0 })
      const end   = new Date(start); end.setDate(start.getDate() + 6)
      if (isSameMonth(start, end)) {
        return `${format(start, 'MMM d', { locale: fr })} – ${format(end, 'd', { locale: fr })}`
          .replace(/^\w/, (c: string) => c.toUpperCase())
      }
      return `${format(start, 'MMM d', { locale: fr })} – ${format(end, 'MMM d', { locale: fr })}`
        .replace(/^\w/, (c: string) => c.toUpperCase())
    }
    return format(date, 'MMMM yyyy', { locale: fr }).replace(/^\w/, (c: string) => c.toUpperCase())
  })()

  // ── Event click → detail ───────────────────────────────────────────────────
  const handleSelectEvent = useCallback((ce: CalendarEvent) => {
    setDetailEvent(ce.resource)
  }, [])

  // ── Slot click → create ────────────────────────────────────────────────────
  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    setEditEvent(undefined)
    setDefaultDate(format(start, 'yyyy-MM-dd'))
    setFormOpen(true)
  }, [])

  function openCreate() {
    setEditEvent(undefined)
    setDefaultDate(undefined)
    setFormOpen(true)
  }

  function openEdit(event: AcademicEvent) {
    setEditEvent(event)
    setFormOpen(true)
  }

  // ── List view ──────────────────────────────────────────────────────────────
  const listContent = useMemo(() => {
    const now = new Date()
    // Group events by month
    const monthMap = new Map<string, AcademicEvent[]>()
    // Generate months from now - 2 to now + 12
    for (let i = -2; i <= 14; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const key = format(d, 'yyyy-MM')
      monthMap.set(key, [])
    }
    for (const e of events) {
      const key = e.startDate.substring(0, 7)
      if (!monthMap.has(key)) monthMap.set(key, [])
      monthMap.get(key)!.push(e)
    }
    return monthMap
  }, [events])

  // ── Type filter dropdown ───────────────────────────────────────────────────
  const TypeFilterDropdown = () => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setFilterOpen(!filterOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-sm hover:bg-muted/30 transition-colors"
      >
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{typeFilter === 'all' ? 'Tous les événements' : EVENT_TYPE_CONFIG[typeFilter]?.label}</span>
        {typeFilter !== 'all' && (
          <span className="text-[10px]">{EVENT_TYPE_CONFIG[typeFilter]?.emoji}</span>
        )}
        <span className="text-muted-foreground text-xs">▾</span>
      </button>

      {filterOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
          <div className="absolute right-0 top-9 z-20 bg-white border border-border rounded-lg shadow-lg py-1 min-w-48">
            <button
              type="button"
              onClick={() => { setTypeFilter('all'); setFilterOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 flex items-center gap-2"
            >
              {typeFilter === 'all' && <span className="text-[#c2440f]">✓</span>}
              {typeFilter !== 'all' && <span className="w-4" />}
              Tous les événements
            </button>
            {EVENT_TYPES.filter(t => t !== 'event').map(type => {
              const cfg = EVENT_TYPE_CONFIG[type]
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setTypeFilter(type); setFilterOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 flex items-center gap-2"
                >
                  {typeFilter === type && <span className="text-[#c2440f]">✓</span>}
                  {typeFilter !== type && <span className="w-4" />}
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="p-6 space-y-4 h-full">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Calendrier Académique</h1>
          <p className="text-sm text-muted-foreground">Gérez le calendrier académique de votre école</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden bg-white">
            {(['agenda', 'month', 'week', 'day'] as ViewMode[]).map(v => {
              const Icon = VIEW_ICONS[v]
              const isActive = view === v
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-r border-border last:border-r-0',
                    isActive ? 'bg-[#c2440f] text-white' : 'text-muted-foreground hover:bg-muted/30'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {VIEW_LABELS[v]}
                </button>
              )
            })}
          </div>

          {/* Event type filter */}
          <TypeFilterDropdown />

          {/* Create button */}
          <Button
            onClick={openCreate}
            className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Ajouter un événement
          </Button>
        </div>
      </div>

      {/* ── Navigation bar ── */}
      {view !== 'agenda' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate('prev')}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('today')}
              className="px-3 py-1 text-sm font-medium rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={() => navigate('next')}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h2 className="text-lg font-semibold text-[#c2440f]">{dateLabel}</h2>
        </div>
      )}

      {/* ── Calendar or List view ── */}
      {view === 'agenda' ? (
        <ListViewContent
          events={events}
          listContent={listContent}
          showEmpty={showEmpty}
          setShowEmpty={setShowEmpty}
          showPast={showPast}
          setShowPast={setShowPast}
          activeDays={activeDays}
          setActiveDays={setActiveDays}
          onEventClick={(e) => setDetailEvent(e)}
        />
      ) : (
        <div className="calendar-wrapper rounded-xl border border-border overflow-hidden bg-white">
          {isLoading ? (
            <div className="h-[600px] flex items-center justify-center text-muted-foreground text-sm">
              Chargement...
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              view={view === 'month' ? Views.MONTH : view === 'week' ? Views.WEEK : Views.DAY}
              date={date}
              onNavigate={setDate}
              onView={() => {}}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              popup
              toolbar={false}
              components={{ event: EventComponent }}
              formats={{
                dayFormat: (date, culture, localizer) =>
                  localizer?.format(date, 'd EEE', culture) ?? '',
                weekdayFormat: (date, culture, localizer) =>
                  localizer?.format(date, 'EEE', culture)?.toUpperCase() ?? '',
                timeGutterFormat: (date, culture, localizer) =>
                  localizer?.format(date, 'h:mm aaa', culture) ?? '',
                dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
                  `${localizer?.format(start, 'MMM d', culture)} – ${localizer?.format(end, 'd', culture)}`,
              }}
              style={{ height: 600 }}
            />
          )}
        </div>
      )}

      {/* ── Dialogs ── */}
      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editEvent}
        defaultDate={defaultDate}
      />
      <EventDetailDialog
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onEdit={(e) => { setDetailEvent(null); openEdit(e) }}
      />
    </div>
  )
}

// ── List view ─────────────────────────────────────────────────────────────────
function ListViewContent({
  events, listContent, showEmpty, setShowEmpty, showPast, setShowPast,
  activeDays, setActiveDays, onEventClick,
}: {
  events: AcademicEvent[]
  listContent: Map<string, AcademicEvent[]>
  showEmpty: boolean
  setShowEmpty: (v: boolean) => void
  showPast: boolean
  setShowPast: (v: boolean) => void
  activeDays: number[]
  setActiveDays: (v: number[]) => void
  onEventClick: (e: AcademicEvent) => void
}) {
  const now = new Date()

  function toggleDay(d: number) {
    if (activeDays.includes(d)) {
      if (activeDays.length === 1) return
      setActiveDays(activeDays.filter(x => x !== d))
    } else {
      setActiveDays([...activeDays, d])
    }
  }

  function setAllDays() {
    setActiveDays([0, 1, 2, 3, 4, 5, 6])
  }

  return (
    <div className="space-y-4">
      {/* List filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          active={showEmpty}
          onClick={() => setShowEmpty(!showEmpty)}
          label="Jours vides"
          icon="📅"
        />
        <FilterChip
          active={showPast}
          onClick={() => setShowPast(!showPast)}
          label="Événements passés"
          icon="⏮"
        />
        <div className="flex border border-border rounded-lg overflow-hidden bg-white">
          <button
            type="button"
            onClick={setAllDays}
            className={cn(
              'px-3 py-1.5 text-xs font-medium border-r border-border transition-colors',
              activeDays.length === 7 ? 'bg-[#c2440f] text-white' : 'text-muted-foreground hover:bg-muted/30'
            )}
          >
            Tous
          </button>
          {LIST_DAYS.map(d => (
            <button
              key={d.key}
              type="button"
              onClick={() => toggleDay(d.key)}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium border-r border-border last:border-r-0 transition-colors',
                activeDays.includes(d.key) ? 'bg-[#c2440f]/10 text-[#c2440f]' : 'text-muted-foreground hover:bg-muted/30'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month groups */}
      <div className="space-y-6">
        {Array.from(listContent.entries()).map(([monthKey, monthEvents]) => {
          const [year, month] = monthKey.split('-').map(Number)
          const monthDate = new Date(year, month - 1, 1)
          const monthLabel = format(monthDate, 'MMMM yyyy', { locale: fr })
            .replace(/^\w/, (c: string) => c.toUpperCase())

          const isPast = monthDate < new Date(now.getFullYear(), now.getMonth(), 1)
          if (isPast && !showPast) return null
          if (monthEvents.length === 0 && !showEmpty) return null

          // Group events by date within the month
          const byDate = new Map<string, AcademicEvent[]>()
          for (const e of monthEvents) {
            if (!byDate.has(e.startDate)) byDate.set(e.startDate, [])
            byDate.get(e.startDate)!.push(e)
          }

          return (
            <div key={monthKey}>
              <h3 className="text-base font-semibold text-[#c2440f] mb-2">{monthLabel}</h3>
              <div className="rounded-xl border border-border overflow-hidden bg-white">
                {/* Header */}
                <div className="grid grid-cols-[120px_1fr] border-b border-border px-4 py-2 bg-muted/10">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Événements</span>
                </div>

                {monthEvents.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground italic">Aucun événement</div>
                ) : (
                  Array.from(byDate.entries()).map(([dateStr, dayEvents]) => {
                    const d = parseISO(dateStr)
                    const dayOfWeek = getDay(d)
                    if (!activeDays.includes(dayOfWeek)) return null

                    const dateLabel = format(d, 'EEEE, d MMMM yyyy', { locale: fr })
                      .replace(/^\w/, (c: string) => c.toUpperCase())

                    return (
                      <div key={dateStr} className="grid grid-cols-[120px_1fr] px-4 py-3 border-b border-border/50 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium">{format(d, 'd')}</p>
                          <p className="text-xs text-muted-foreground">{dateLabel}</p>
                          <p className="text-xs text-muted-foreground">{dayEvents.length} événement{dayEvents.length > 1 ? 's' : ''}</p>
                        </div>
                        <div className="space-y-1.5">
                          {dayEvents.map(e => {
                            const cfg = EVENT_TYPE_CONFIG[e.type as EventType] ?? EVENT_TYPE_CONFIG.other
                            return (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => onEventClick(e)}
                                className="flex items-center gap-2 hover:bg-muted/30 rounded-lg px-2 py-1 transition-colors w-full text-left"
                              >
                                <div className={cn('w-0.5 h-6 rounded-full shrink-0', cfg.pillBg)} />
                                <span className="text-sm">{cfg.emoji}</span>
                                <span className="text-sm font-medium">{e.title}</span>
                                {!e.isAllDay && e.startTime && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeDisplay(e.startTime)}
                                    {e.endTime ? ` - ${formatTimeDisplay(e.endTime)}` : ''}
                                  </span>
                                )}
                                <span className={cn(
                                  'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded',
                                  cfg.bg, cfg.color
                                )}>
                                  {cfg.label}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, label, icon }: {
  active: boolean; onClick: () => void; label: string; icon: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
        active
          ? 'bg-[#c2440f]/10 border-[#c2440f]/30 text-[#c2440f]'
          : 'border-border text-muted-foreground hover:bg-muted/30'
      )}
    >
      <span>{icon}</span>
      {label}
    </button>
  )
}
