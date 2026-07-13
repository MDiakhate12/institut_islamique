'use client'

import { useState } from 'react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ClipboardCheck, Clock, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChildren } from '@/modules/parents/parents.hooks'
import { useParentAttendance } from '@/modules/attendance/attendance.hooks'
import { LinkChildModal } from '../children/LinkChildModal'
import type { ParentAttendanceEntry } from '@/modules/attendance/attendance.types'
import type { AttendanceStatus } from '@/modules/attendance/attendance.types'

const PAGE_SIZE = 20

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Présent',
  late:    'En retard',
  absent:  'Absent',
  excused: 'Excusé',
}

const STATUS_CLS: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-700 border-green-200',
  late:    'bg-amber-100 text-amber-700 border-amber-200',
  absent:  'bg-red-100 text-red-700 border-red-200',
  excused: 'bg-blue-100 text-blue-700 border-blue-200',
}

function formatDateHeading(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d))     return "Aujourd'hui"
  if (isYesterday(d)) return 'Hier'
  return format(d, 'EEEE d MMMM yyyy', { locale: fr })
}

function formatTime(date: Date): string {
  return format(date, 'HH:mm', { locale: fr })
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border border-border bg-white p-4 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
          <div className="h-3 w-48 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

// ── Empty state (no linked children) ─────────────────────────────────────────

function NoChildrenState({ onLinked }: { onLinked: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-8">
      <div className="flex flex-col items-start gap-4 max-w-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-xl">
            😊
          </div>
          <h2 className="text-lg font-semibold text-amber-900">Aucun enfant trouvé</h2>
        </div>

        <p className="text-sm text-amber-800">
          Vous n&apos;avez aucun enfant enregistré dans le système. Cliquez sur le bouton
          ci-dessous pour lier vos enfants à votre compte en toute sécurité.
        </p>

        <LinkChildModal onLinked={onLinked}>
          <button className="flex items-center gap-2 bg-[#c2440f] hover:bg-[#a33a0d] text-white
                             text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <Plus className="h-4 w-4" />
            Ajouter d&apos;autres enfants
          </button>
        </LinkChildModal>

        <div className="space-y-1.5 text-xs text-amber-700">
          <p>✓ Vous devrez vérifier votre numéro de téléphone pour lier des élèves à votre compte.</p>
          <p>🔒 Utilisez le numéro de téléphone enregistré dans le compte scolaire de votre enfant.</p>
        </div>
      </div>
    </div>
  )
}

// ── Single attendance card ────────────────────────────────────────────────────

function AttendanceCard({ entry }: { entry: ParentAttendanceEntry }) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{entry.className}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Classe {entry.catalogCode}
            {entry.section ? ` - Section ${entry.section}` : ''}
          </p>
          {entry.submittedAt && entry.submittedByName && (
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {formatTime(new Date(entry.submittedAt))} par {entry.submittedByName}
            </p>
          )}
        </div>

        {entry.status ? (
          <span className={cn(
            'shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border',
            STATUS_CLS[entry.status],
          )}>
            {STATUS_LABEL[entry.status]}
          </span>
        ) : (
          <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full
                           bg-gray-100 text-gray-500 border border-gray-200">
            Non soumis
          </span>
        )}
      </div>
    </div>
  )
}

// ── Timeline grouped by date ──────────────────────────────────────────────────

function Timeline({ entries }: { entries: ParentAttendanceEntry[] }) {
  // Group by date
  const grouped = new Map<string, ParentAttendanceEntry[]>()
  for (const e of entries) {
    const list = grouped.get(e.date) ?? []
    list.push(e)
    grouped.set(e.date, list)
  }

  if (grouped.size === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Aucune présence enregistrée pour le moment.
      </div>
    )
  }

  const isRecent = (dateStr: string) => isToday(parseISO(dateStr)) || isYesterday(parseISO(dateStr))

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([date, dayEntries]) => (
        <div key={date}>
          {/* Date heading */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-700 capitalize">
              {formatDateHeading(date)}
            </span>
            {isRecent(date) && (
              <span className="text-[11px] font-bold bg-gray-900 text-white px-2 py-0.5 rounded-full">
                {isToday(parseISO(date)) ? "Aujourd'hui" : 'Hier'}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {dayEntries.map(entry => (
              <AttendanceCard key={`${entry.date}-${entry.classId}`} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ParentAttendanceClient() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const { data: children = [], isLoading: childrenLoading, refetch: refetchChildren } = useChildren()

  // Auto-select first child
  const effectiveStudentId = selectedStudentId ?? children[0]?.studentId ?? null

  const { data: entries = [], isLoading: entriesLoading } = useParentAttendance(effectiveStudentId)

  const visibleEntries = entries.slice(0, visibleCount)
  const hasMore = visibleCount < entries.length

  function handleLinked() {
    refetchChildren()
  }

  if (childrenLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <Skeleton />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[#fdf6f0] border border-[#f0dcc8] flex items-center justify-center">
            <ClipboardCheck className="h-4.5 w-4.5 text-[#c2440f]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#7a4f30]">Registres de présence</h1>
            <p className="text-sm text-muted-foreground">Chronologie des présences</p>
          </div>
        </div>

        {children.length > 0 && (
          <LinkChildModal onLinked={handleLinked}>
            <button className="flex items-center gap-1.5 bg-[#c2440f] hover:bg-[#a33a0d] text-white
                               text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0">
              <Plus className="h-4 w-4" />
              Ajouter d&apos;autres enfants
            </button>
          </LinkChildModal>
        )}
      </div>

      {/* No children state */}
      {children.length === 0 && (
        <NoChildrenState onLinked={handleLinked} />
      )}

      {/* Child tabs + timeline */}
      {children.length > 0 && (
        <>
          {/* Child selector tabs */}
          {children.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {children.map(child => (
                <button
                  key={child.studentId}
                  onClick={() => {
                    setSelectedStudentId(child.studentId)
                    setVisibleCount(PAGE_SIZE)
                  }}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
                    effectiveStudentId === child.studentId
                      ? 'bg-[#7a4f30] text-white border-[#7a4f30]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#7a4f30] hover:text-[#7a4f30]'
                  )}
                >
                  {child.firstName} {child.lastName}
                </button>
              ))}
            </div>
          )}

          {/* Single child: show name as pill */}
          {children.length === 1 && (
            <div className="flex gap-2">
              <span className="px-4 py-1.5 rounded-full text-sm font-medium border
                               bg-white text-gray-600 border-gray-200">
                {children[0].firstName} {children[0].lastName}
              </span>
            </div>
          )}

          {/* Timeline */}
          {entriesLoading ? (
            <Skeleton />
          ) : (
            <>
              <Timeline entries={visibleEntries} />

              {/* Load more */}
              {hasMore && (
                <div className="flex flex-col items-center gap-1 pt-2">
                  <button
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-full border border-[#c2440f]
                               text-[#c2440f] text-sm font-medium hover:bg-[#fdf6f0] transition-colors"
                  >
                    ↓ Charger plus
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Affichage de {visibleCount} sur {entries.length}
                  </p>
                </div>
              )}

              {!hasMore && entries.length > 0 && (
                <p className="text-center text-xs text-muted-foreground pt-2">
                  Affichage de {entries.length} sur {entries.length}
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
