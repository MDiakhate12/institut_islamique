'use client'

import { useState, useMemo } from 'react'
import { useTeachers } from '@/modules/teachers/teachers.hooks'
import { TeacherFormDialog } from './TeacherForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download, Search, Mail, Phone, Pencil, Copy, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportTeachersToExcel } from './teachers.excel'
import type { TeacherListItem } from '@/modules/teachers/teachers.types'
import type { Teacher } from '@/modules/teachers/teachers.types'

// ── Filter state ────────────────────────────────────────────────────────────
type GenderFilter   = 'male' | 'female' | null
type ActiveFilter   = true | false | null
type BenevolFilter  = true | false | null

// ── Helpers ─────────────────────────────────────────────────────────────────
function shortId(id: string) {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export function TeachersClient() {
  const { data: teachers, isLoading } = useTeachers()

  const [search,       setSearch]       = useState('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>(null)
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(null)
  const [benevolFilter,setBenevolFilter]= useState<BenevolFilter>(null)

  const filtered = useMemo(() => {
    if (!teachers) return []
    return teachers.filter(t => {
      if (genderFilter !== null && t.gender !== genderFilter) return false
      if (activeFilter !== null && !t.isPending !== activeFilter) return false
      if (benevolFilter !== null && (t.teacherType === 'volunteer') !== benevolFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          (t.fullName?.toLowerCase().includes(q) ?? false) ||
          t.email.toLowerCase().includes(q) ||
          (t.phone?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
  }, [teachers, search, genderFilter, activeFilter, benevolFilter])

  return (
    <div className="p-6 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-foreground">
          Enseignants{' '}
          {teachers && (
            <span className="text-sm font-normal text-muted-foreground">
              ({teachers.length} enseignant{teachers.length !== 1 ? 's' : ''})
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-green-600 text-green-700 hover:bg-green-50 gap-1.5"
            onClick={() => teachers && exportTeachersToExcel(teachers)}
            disabled={!teachers?.length}
          >
            <Download className="h-4 w-4" />
            Télécharger en Excel
          </Button>
          <TeacherFormDialog />
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un enseignant par nom, ID ou email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* ── Filter chips ── */}
      <div className="flex items-center gap-4 flex-wrap text-sm">
        {/* Genre */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Genre :</span>
          <CircleChip
            color="bg-blue-500"
            active={genderFilter === 'male'}
            onClick={() => setGenderFilter(genderFilter === 'male' ? null : 'male')}
            title="Masculin"
          />
          <CircleChip
            color="bg-pink-400"
            active={genderFilter === 'female'}
            onClick={() => setGenderFilter(genderFilter === 'female' ? null : 'female')}
            title="Féminin"
          />
        </div>

        {/* Actif */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Actif :</span>
          <CircleChip
            color="bg-emerald-500"
            active={activeFilter === true}
            onClick={() => setActiveFilter(activeFilter === true ? null : true)}
            title="Actif"
          />
          <CircleChip
            color="bg-red-400"
            active={activeFilter === false}
            onClick={() => setActiveFilter(activeFilter === false ? null : false)}
            title="Inactif"
          />
        </div>

        {/* Bénévole */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Bénévole :</span>
          <CircleChip
            color="bg-emerald-500"
            active={benevolFilter === true}
            onClick={() => setBenevolFilter(benevolFilter === true ? null : true)}
            title="Bénévole"
          />
          <CircleChip
            color="bg-yellow-400"
            active={benevolFilter === false}
            onClick={() => setBenevolFilter(benevolFilter === false ? null : false)}
            title="Payé"
          />
        </div>
      </div>

      {/* ── Cards grid ── */}
      {isLoading ? (
        <TeachersSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-medium text-foreground">Aucun enseignant trouvé</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'Essayez un autre terme de recherche.' : 'Créez votre premier enseignant.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(teacher => (
            <TeacherCard key={teacher.id} teacher={teacher} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── CircleChip ──────────────────────────────────────────────────────────────
function CircleChip({ color, active, onClick, title }: {
  color: string
  active: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'w-5 h-5 rounded-full transition-all',
        color,
        active ? 'ring-2 ring-offset-1 ring-foreground/40 scale-110' : 'opacity-60 hover:opacity-90'
      )}
    />
  )
}

// ── TeacherCard ─────────────────────────────────────────────────────────────
function TeacherCard({ teacher }: { teacher: TeacherListItem }) {
  const isActive   = !teacher.isPending
  const isVolunteer = teacher.teacherType === 'volunteer'
  const id          = shortId(teacher.id)

  return (
    <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">

      {/* Row 1: Name + badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <span className="font-semibold text-sm truncate">
            {teacher.fullName ?? <span className="italic text-muted-foreground">Sans nom</span>}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {teacher.teacherType && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium border',
              isVolunteer
                ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
                : 'text-blue-700 bg-blue-50 border-blue-300'
            )}>
              {isVolunteer ? 'Volunteer' : '$Paid'}
            </span>
          )}
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            isActive
              ? 'bg-emerald-500 text-white'
              : 'bg-orange-100 text-orange-700'
          )}>
            {isActive ? 'Active' : 'En attente'}
          </span>
        </div>
      </div>

      {/* Row 2: ID + copy */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="font-mono">{id}</span>
        <button
          type="button"
          title="Copier l'ID"
          onClick={() => navigator.clipboard.writeText(teacher.id)}
          className="hover:text-foreground transition-colors"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>

      {/* Row 3: Active class (if any) */}
      {teacher.classCount > 0 && (
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full truncate">
            {teacher.classCount} classe{teacher.classCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Row 4: Contact */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{teacher.email}</span>
        </div>
        {teacher.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{teacher.phone}</span>
          </div>
        )}
      </div>

      {/* Row 5: Edit button */}
      <div className="flex justify-end pt-1 border-t border-border/50">
        <TeacherFormDialog
          teacher={teacher as unknown as Teacher}
          trigger={
            <button
              type="button"
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          }
        />
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function TeachersSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-border p-4 space-y-3 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted" />
            <div className="h-3.5 bg-muted rounded w-2/3" />
          </div>
          <div className="h-3 bg-muted rounded w-1/3" />
          <div className="space-y-1.5">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
