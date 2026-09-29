'use client'

import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useClasses } from '@/modules/classes/classes.hooks'
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
  Plus, Download, Settings2, X,
} from 'lucide-react'
import { updateSchoolSettingsAction } from '@/modules/school/school.actions'
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
        <h2 key={i} className="text-sm font-semibold text-[#2d6a4f] mt-4 mb-1 first:mt-0">
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
  const [manageRoomsOpen, setManageRoomsOpen] = useState(false)

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
            className="gap-1.5 text-muted-foreground"
            onClick={() => setManageRoomsOpen(true)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Gérer les salles de classe
          </Button>
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
            teachers={teachers ?? []}
            rooms={configuredRooms}
            trigger={
              <Button size="sm" className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white gap-1.5">
                <Plus className="h-4 w-4" />
                Créer une nouvelle classe
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
          className="h-9 border border-border rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#2d6a4f]/30 text-muted-foreground"
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
          className="h-9 border border-border rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#2d6a4f]/30 text-muted-foreground"
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
          className="h-9 border border-border rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#2d6a4f]/30 text-muted-foreground"
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

      {/* ── Manage rooms dialog ── */}
      <ManageRoomsDialog
        open={manageRoomsOpen}
        onOpenChange={setManageRoomsOpen}
        currentRooms={configuredRooms}
        school={school}
      />
    </div>
  )
}

// ── Single class card ─────────────────────────────────────────────────────────
function ClassCard({
  scheduledClass: c,
  allClasses,
  teachers,
  rooms,
  onEditStudents,
  onViewSyllabus,
}: {
  scheduledClass: ClassWithDetails
  allClasses: ClassWithDetails[]
  teachers: import('@/modules/teachers/teachers.types').TeacherListItem[]
  rooms: string[]
  onEditStudents: () => void
  onViewSyllabus: () => void
}) {
  const colors = getSubjectColor(c.subjectCode)

  return (
    <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-2.5 hover:shadow-sm transition-shadow">
      {/* Top: subject badge */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {c.subjectCode && (
          <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded', colors.bg, colors.text)}>
            {c.subjectCode}
          </span>
        )}
      </div>

      {/* Name */}
      <p className="font-semibold text-sm leading-snug line-clamp-2">{c.name}</p>

      {/* Details */}
      <div className="space-y-1">
        {c.room && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>Salle : {c.room}</span>
          </div>
        )}
        {c.teacherName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GraduationCap className="h-3 w-3 shrink-0" />
            <span>Enseignant : {c.teacherName}</span>
          </div>
        )}
        <div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">
            0 devoirs
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
          Gérer les élèves ({c.enrollmentCount})
        </button>
        {/* Spacer */}
        <div className="flex-1" />
        {/* Edit + Delete icons */}
        <ClassFormDialog
          scheduledClass={c}
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
            <BookOpen className="h-4 w-4 text-[#2d6a4f]" />
            {scheduledClass.name} — Programme
          </DialogTitle>
        </DialogHeader>
        <div className="pt-1">
          {scheduledClass.curriculum ? (
            renderCurriculum(scheduledClass.curriculum)
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Aucun programme défini pour cette classe.
              <br />
              <span className="not-italic text-[#2d6a4f]">
                Cliquez sur Modifier pour ajouter un programme.
              </span>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Manage rooms dialog ───────────────────────────────────────────────────────
function ManageRoomsDialog({
  open,
  onOpenChange,
  currentRooms,
  school,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRooms: string[]
  school: import('@/modules/school/school.types').School | undefined
}) {
  const [rooms, setRooms] = useState<string[]>(currentRooms)
  const [newRoom, setNewRoom] = useState('')
  const [saving, setSaving] = useState(false)
  const qc = useQueryClient()

  // Sync if currentRooms changes (e.g. parent re-fetches)
  useState(() => { setRooms(currentRooms) })

  async function handleSave() {
    if (!school) return
    setSaving(true)
    const result = await updateSchoolSettingsAction({ ...school.settings, rooms })
    setSaving(false)
    if (!result.success) { toast.error(result.error); return }
    qc.invalidateQueries({ queryKey: ['school'] })
    toast.success('Salles mises à jour')
    onOpenChange(false)
  }

  function addRoom() {
    const v = newRoom.trim()
    if (!v || rooms.includes(v)) return
    setRooms(prev => [...prev, v])
    setNewRoom('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-[#2d6a4f]" />
            Gérer les salles de classe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Existing rooms */}
          <div className="space-y-1.5">
            {rooms.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucune salle configurée.</p>
            ) : (
              rooms.map(r => (
                <div key={r} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-muted/40 border border-border">
                  <span className="text-sm">{r}</span>
                  <button
                    type="button"
                    onClick={() => setRooms(prev => prev.filter(x => x !== r))}
                    className="p-0.5 rounded hover:bg-red-100 hover:text-red-600 text-muted-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add new */}
          <div className="flex gap-2">
            <Input
              placeholder="Nom de la salle (ex. Salle 1, Salle A)"
              value={newRoom}
              onChange={e => setNewRoom(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRoom() } }}
              className="h-9"
            />
            <Button type="button" size="sm" variant="outline" onClick={addRoom} className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
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
