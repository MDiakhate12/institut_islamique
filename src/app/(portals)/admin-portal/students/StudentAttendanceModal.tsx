'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useStudentAttendanceCalendar } from '@/modules/students/students.hooks'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useMemo } from 'react'

const STATUS_COLORS: Record<string, string> = {
  present:  'bg-green-500 text-white',
  late:     'bg-amber-400 text-white',
  absent:   'bg-red-500 text-white',
  excused:  'bg-blue-400 text-white',
  missing:  'bg-gray-200 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  present: 'Présent',
  late:    'En retard',
  absent:  'Absent',
  excused: 'Excusé',
  missing: 'Non renseigné',
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  studentId: string
  studentName: string
}

export function StudentAttendanceModal({ open, onOpenChange, studentId, studentName }: Props) {
  const { data, isLoading } = useStudentAttendanceCalendar(studentId, open)

  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const statusByDate = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of data ?? []) map[d.date] = d.status
    return map
  }, [data])

  // Months that have at least one record
  const summary = useMemo(() => {
    const counts = { present: 0, late: 0, absent: 0, excused: 0 }
    for (const d of data ?? []) {
      if (d.status in counts) counts[d.status as keyof typeof counts]++
    }
    return counts
  }, [data])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: Array<{ day: number | null; dateStr: string | null }> = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateStr: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Présences de {studentName}</DialogTitle>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary chips */}
            <div className="flex gap-2 flex-wrap">
              {Object.entries(summary).map(([s, n]) => (
                <span key={s} className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s]}`}>
                  {STATUS_LABELS[s]} : {n}
                </span>
              ))}
            </div>

            {/* Month navigator */}
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-sm">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {DAY_NAMES.map(d => (
                <div key={d} className="font-medium text-gray-500 pb-1">{d}</div>
              ))}
              {cells.map((cell, i) => {
                if (!cell.day || !cell.dateStr) {
                  return <div key={`empty-${i}`} />
                }
                const status = statusByDate[cell.dateStr]
                return (
                  <div
                    key={cell.dateStr}
                    title={status ? STATUS_LABELS[status] : undefined}
                    className={`w-full aspect-square flex items-center justify-center rounded-full text-xs font-medium
                      ${status ? STATUS_COLORS[status] : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {cell.day}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-3 flex-wrap pt-1 border-t text-xs text-gray-600">
              {Object.entries(STATUS_COLORS).map(([s, cls]) => (
                <span key={s} className="flex items-center gap-1">
                  <span className={`w-3 h-3 rounded-full inline-block ${cls}`} />
                  {STATUS_LABELS[s]}
                </span>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
