'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminStudentEntry, AttendanceStatus } from '@/modules/attendance/attendance.types'

export type DialogStatusFilter = AttendanceStatus | 'unmarked'

interface Props {
  open: boolean
  onClose: () => void
  statusFilter: DialogStatusFilter
  entries: AdminStudentEntry[]
}

const DIALOG_TITLE: Record<DialogStatusFilter, string> = {
  present:  'Élèves présents',
  late:     'Élèves en retard',
  absent:   'Élèves absents',
  excused:  'Élèves excusés',
  unmarked: 'Élèves non marqués',
}

const STATUS_DOT: Record<DialogStatusFilter, string> = {
  present:  'bg-green-500',
  late:     'bg-amber-500',
  absent:   'bg-red-500',
  excused:  'bg-blue-500',
  unmarked: 'bg-gray-400',
}

export function StudentListDialog({ open, onClose, statusFilter, entries }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const byStatus = entries.filter(e =>
      statusFilter === 'unmarked' ? e.status === null : e.status === statusFilter
    )
    if (!search) return byStatus
    const q = search.toLowerCase()
    return byStatus.filter(e =>
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.className.toLowerCase().includes(q)
    )
  }, [entries, statusFilter, search])

  const total = entries.filter(e =>
    statusFilter === 'unmarked' ? e.status === null : e.status === statusFilter
  ).length

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', STATUS_DOT[statusFilter])} />
            <h2 className="font-semibold text-base">{DIALOG_TITLE[statusFilter]}</h2>
            <span className="ml-auto text-sm text-muted-foreground">{total} élève{total !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Aucun élève trouvé</div>
          ) : (
            filtered.map(e => (
              <div key={`${e.studentId}-${e.classId}`} className="flex items-center gap-3 px-5 py-3">
                <div className={cn('h-2 w-2 rounded-full shrink-0', STATUS_DOT[statusFilter])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.firstName} {e.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.className}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-border bg-muted/40">
          <p className="text-xs text-muted-foreground text-center">
            {filtered.length} sur {total} résultat{total !== 1 ? 's' : ''}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
