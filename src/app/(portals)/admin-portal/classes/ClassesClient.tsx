'use client'

import { useState, useMemo } from 'react'
import { useClasses } from '@/modules/classes/classes.hooks'
import { useCatalogClasses } from '@/modules/classes/classes.hooks'
import { useTeachers } from '@/modules/teachers/teachers.hooks'
import { useSchool } from '@/modules/school/school.hooks'
import { getSubjectColor, SUBJECT_LABELS } from '@/modules/classes/classes.types'
import type { ClassWithDetails } from '@/modules/classes/classes.types'
import { ClassFormDialog } from './ClassForm'
import { ClassStudentsDialog } from './ClassStudentsDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Search, Pencil, Users, BookOpen, MapPin, GraduationCap,
  Plus, Download, BookText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type GroupBy = 'type' | 'room'

// ── Simple markdown renderer for syllabus ─────────────────────────────────────
function renderCurriculum(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-sm font-semibold text-[#c2440f] mt-4 mb-1 first:mt-0">
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-base font-bold text-foreground mt-4 mb-1 first:mt-0">
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-0.5 text-sm text-foreground mb-2">
          {items.map((item, j) => <li key={j}>{item}</li>)}
        </ul>
      )
      continue
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={i} className="list-decimal list-inside space-y-0.5 text-sm text-foreground mb-2">
          {items.map((item, j) => <li key={j}>{item}</li>)}
        </ol>
      )
      continue
    } else if (line.trim()) {
      elements.push(
        <p key={i} className="text-sm text-foreground mb-1">{line}</p>
      )
    }
    i++
  }

  return <>{elements}</>
}

export function ClassesClient() {
  const { data: classes, isLoading } = useClasses()
  const { data: catalogClasses } = useCatalogClasses()
  const { data: teachers } = useTeachers()
  const { data: school } = useSchool()
  const configuredRooms = school?.settings?.rooms ?? []

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterTeacher, setFilterTeacher] = useState<string>('')
  const [filterRoom, setFilterRoom] = useState<string>('')
  const [groupBy, setGroupBy] = useState<GroupBy>('type')

  // Dialog state
  const [studentsClass, setStudentsClass] = useState<ClassWithDetails | null>(null)
  const [syllabusClass, setSyllabusClass] = useState<ClassWithDetails | null>(null)

  // Derived filter options
  const teacherOptions = useMemo(() =>
    [...new Map((teachers ?? []).map(t => [t.id, t])).values()],
    [teachers]
  )
  const roomOptions = useMemo(() => {
    const rooms = (classes ?? []).map(c => c.room).filter((r): r is string => !!r)
    return [...new Set(rooms)].sort()
  }, [classes])

  const subjectOptions = useMemo(() => {
    const codes = (classes ?? []).map(c => c.subjectCode).filter((s): s is string => !!s)
    return [...new Set(codes)].sort()
  }, [classes])

  // Filtered list
  const filtered = useMemo(() => {
    let list = classes ?? []
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.fullCode.toLowerCase().includes(q) ||
        (c.room?.toLowerCase().includes(q) ?? false) ||
        (c.teacherName?.toLowerCase().includes(q) ?? false)
      )
    }
    if (filterType) list = list.filter(c => c.subjectCode === filterType)
    if (filterTeacher) list = list.filter(c => c.teacherId === filterTeacher)
    if (filterRoom) list = list.filter(c => c.room === filterRoom)
    return list
  }, [classes, search, filterType, filterTeacher, filterRoom])

  // Grouped
  const groups = useMemo(() => {
    const map = new Map<string, ClassWithDetails[]>()
    for (const c of filtered) {
      const key = groupBy === 'type'
        ? (c.subjectCode ?? 'Autre')
        : (c.room ?? 'Sans salle')
      const list = map.get(key) ?? []
      list.push(c)
      map.set(key, list)
    }
    return map
  }, [filtered, groupBy])

  return (
    <div className="p-6 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">
          Classes{' '}
          {classes && (
            <span className="text-sm font-normal text-muted-foreground">
              ({classes.length} classe{classes.length !== 1 ? 's' : ''})
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            onClick={() => toast.info("Export Excel disponible bientôt")}
          >
            <Download className="h-3.5 w-3.5" />
            Télécharger en Excel
          </Button>
          <ClassFormDialog
            catalogClasses={catalogClasses ?? []}
            teachers={teachers ?? []}
            rooms={configuredRooms}
            trigger={
              <Button size="sm" className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5">
                <Plus className="h-4 w-4" />
                Créer une nouvelle offre de classe
              </Button>
            }
          />
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des classes par nom ou identifiant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Type dropdown */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="h-9 border border-border rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30 text-muted-foreground"
        >
          <option value="">Tous les types</option>
          {subjectOptions.map(code => (
            <option key={code} value={code}>
              {SUBJECT_LABELS[code] ?? code} ({code})
            </option>
          ))}
        </select>

        {/* Teacher dropdown */}
        <select
          value={filterTeacher}
          onChange={e => setFilterTeacher(e.target.value)}
          className="h-9 border border-border rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30 text-muted-foreground"
        >
          <option value="">Tous les enseignants</option>
          {teacherOptions.map(t => (
            <option key={t.id} value={t.id}>{t.fullName ?? t.email}</option>
          ))}
        </select>

        {/* Room dropdown */}
        <select
          value={filterRoom}
          onChange={e => setFilterRoom(e.target.value)}
          className="h-9 border border-border rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30 text-muted-foreground"
        >
          <option value="">Toutes les salles</option>
          {roomOptions.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* ── Group-by tabs ── */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border w-fit">
        {([['type', 'Par type de classe'], ['room', 'Par salle de classe']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setGroupBy(key)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
              groupBy === key
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <ClassesSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium">Aucune classe trouvée</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || filterType || filterTeacher || filterRoom
              ? 'Essayez de modifier les filtres.'
              : 'Créez votre première classe.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([groupKey, items]) => {
            const colors = groupBy === 'type' ? getSubjectColor(groupKey) : null
            const label = groupBy === 'type'
              ? (SUBJECT_LABELS[groupKey] ?? groupKey)
              : groupKey

            return (
              <section key={groupKey}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  {colors ? (
                    <span className={cn('text-sm font-bold px-2 py-0.5 rounded', colors.bg, colors.text)}>
                      {groupKey}
                    </span>
                  ) : (
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  )}
                  {groupBy === 'room' && (
                    <span className="font-semibold text-foreground">{label}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {items.length} classe{items.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(c => (
                    <ClassCard
                      key={c.id}
                      scheduledClass={c}
                      allClasses={classes ?? []}
                      catalogClasses={catalogClasses ?? []}
                      teachers={teachers ?? []}
                      rooms={configuredRooms}
                      onEditStudents={() => setStudentsClass(c)}
                      onViewSyllabus={() => setSyllabusClass(c)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* ── Students dialog ── */}
      {studentsClass && (
        <ClassStudentsDialog
          scheduledClass={studentsClass}
          allClasses={classes ?? []}
          open={!!studentsClass}
          onOpenChange={open => { if (!open) setStudentsClass(null) }}
        />
      )}

      {/* ── Syllabus dialog ── */}
      {syllabusClass && (
        <SyllabusDialog
          scheduledClass={syllabusClass}
          open={!!syllabusClass}
          onOpenChange={open => { if (!open) setSyllabusClass(null) }}
        />
      )}
    </div>
  )
}

// ── Single class card ─────────────────────────────────────────────────────────
function ClassCard({
  scheduledClass: c,
  allClasses,
  catalogClasses,
  teachers,
  rooms,
  onEditStudents,
  onViewSyllabus,
}: {
  scheduledClass: ClassWithDetails
  allClasses: ClassWithDetails[]
  catalogClasses: import('@/modules/classes/classes.types').CatalogClassWithNext[]
  teachers: import('@/modules/teachers/teachers.types').TeacherListItem[]
  rooms: string[]
  onEditStudents: () => void
  onViewSyllabus: () => void
}) {
  const colors = getSubjectColor(c.subjectCode)

  return (
    <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-2.5 hover:shadow-sm transition-shadow">
      {/* Top: badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {c.subjectCode && (
          <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded', colors.bg, colors.text)}>
            {c.subjectCode}
          </span>
        )}
        {c.levelNumber && (
          <span className="text-xs font-mono text-muted-foreground font-medium">{c.levelNumber}</span>
        )}
        {c.section && (
          <span className="text-xs text-muted-foreground">Sec {c.section}</span>
        )}
      </div>

      {/* Name */}
      <p className="font-semibold text-sm leading-snug line-clamp-2">{c.name}</p>

      {/* Details */}
      <div className="space-y-1">
        {c.room && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>Room: {c.room}</span>
          </div>
        )}
        {c.teacherName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GraduationCap className="h-3 w-3 shrink-0" />
            <span>Teacher: {c.teacherName}</span>
          </div>
        )}
        <div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">
            0 homeworks
          </span>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-0 mt-auto pt-2 border-t border-border/60">
        <button
          type="button"
          onClick={onEditStudents}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mr-2"
        >
          <Users className="h-3 w-3" />
          Edit Students ({c.enrollmentCount})
        </button>
        {c.curriculum && (
          <>
            <span className="text-border mx-1">|</span>
            <button
              type="button"
              onClick={onViewSyllabus}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-3 w-3" />
              View Syllabus
            </button>
          </>
        )}
        {/* Spacer */}
        <div className="flex-1" />
        {/* Edit + Delete icons */}
        <ClassFormDialog
          scheduledClass={c}
          catalogClasses={catalogClasses}
          teachers={teachers}
          rooms={rooms}
          trigger={
            <button
              type="button"
              title="Modifier la classe"
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </button>
          }
        />
      </div>
    </div>
  )
}

// ── Syllabus dialog ───────────────────────────────────────────────────────────
function SyllabusDialog({
  scheduledClass,
  open,
  onOpenChange,
}: {
  scheduledClass: ClassWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#c2440f]" />
            {scheduledClass.name} — Syllabus
          </DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm max-w-none pt-1">
          {scheduledClass.curriculum
            ? renderCurriculum(scheduledClass.curriculum)
            : <p className="text-sm text-muted-foreground italic">Aucun programme défini pour cette classe.</p>
          }
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function ClassesSkeleton() {
  return (
    <div className="space-y-8">
      {[3, 2].map((count, g) => (
        <div key={g} className="space-y-3">
          <div className="h-5 bg-muted rounded w-32 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-4 space-y-2.5 animate-pulse">
                <div className="flex gap-2">
                  <div className="h-4 w-10 bg-muted rounded" />
                  <div className="h-4 w-8 bg-muted rounded" />
                </div>
                <div className="h-4 bg-muted rounded w-5/6" />
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-px bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
