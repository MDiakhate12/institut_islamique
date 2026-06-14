import type { InferSelectModel } from 'drizzle-orm'
import { academicEvents } from '@/db/schema'

export type AcademicEvent = InferSelectModel<typeof academicEvents>

export type EventType =
  | 'exam' | 'meeting' | 'fun_event' | 'holiday' | 'open_house'
  | 'ceremony' | 'beginning' | 'closed' | 'lecture' | 'event' | 'other'

// ── Event type display config ─────────────────────────────────────────────────
export const EVENT_TYPE_CONFIG: Record<EventType, {
  label: string
  emoji: string
  color: string        // text color
  bg: string           // background
  border: string       // border
  pillBg: string       // pill background for calendar
  pillText: string     // pill text for calendar
}> = {
  exam: {
    label: 'Exam', emoji: '📋',
    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300',
    pillBg: 'bg-orange-500', pillText: 'text-white',
  },
  meeting: {
    label: 'Meeting', emoji: '👥',
    color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300',
    pillBg: 'bg-purple-500', pillText: 'text-white',
  },
  fun_event: {
    label: 'Fun Event', emoji: '🎉',
    color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300',
    pillBg: 'bg-green-500', pillText: 'text-white',
  },
  holiday: {
    label: 'Holiday', emoji: '⭐',
    color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300',
    pillBg: 'bg-yellow-500', pillText: 'text-white',
  },
  open_house: {
    label: 'Open House', emoji: '🏠',
    color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300',
    pillBg: 'bg-blue-500', pillText: 'text-white',
  },
  ceremony: {
    label: 'Ceremony', emoji: '🎭',
    color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-300',
    pillBg: 'bg-pink-500', pillText: 'text-white',
  },
  beginning: {
    label: 'Beginning', emoji: '🚀',
    color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-300',
    pillBg: 'bg-teal-500', pillText: 'text-white',
  },
  closed: {
    label: 'Closed', emoji: '🔒',
    color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300',
    pillBg: 'bg-red-400', pillText: 'text-white',
  },
  lecture: {
    label: 'Lecture', emoji: '📖',
    color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-300',
    pillBg: 'bg-indigo-500', pillText: 'text-white',
  },
  event: {
    label: 'Event', emoji: '📅',
    color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-300',
    pillBg: 'bg-sky-500', pillText: 'text-white',
  },
  other: {
    label: 'Other', emoji: '···',
    color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-300',
    pillBg: 'bg-gray-400', pillText: 'text-white',
  },
}

export const EVENT_TYPES = Object.keys(EVENT_TYPE_CONFIG) as EventType[]

// ── Calendar event (for react-big-calendar) ───────────────────────────────────
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: AcademicEvent
}
