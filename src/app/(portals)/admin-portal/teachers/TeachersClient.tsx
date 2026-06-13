'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTeachers, useRemoveTeacher } from '@/modules/teachers/teachers.hooks'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge'
import { TeacherInviteForm } from './TeacherInviteForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users, Plus, Download, MoreHorizontal, Pencil, UserMinus, Search,
  BookOpen, Mail, Phone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportTeachersToExcel } from './teachers.excel'
import type { TeacherListItem } from '@/modules/teachers/teachers.types'

type TypeFilter = 'all' | 'volunteer' | 'paid'
type StatusFilter = 'all' | 'active' | 'pending'

function getInitials(fullName: string | null): string {
  if (!fullName) return '?'
  return fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function TeachersClient() {
  const router = useRouter()
  const { data: teachers, isLoading } = useTeachers()
  const { mutate: remove } = useRemoveTeacher()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [inviteOpen, setInviteOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!teachers) return []
    return teachers.filter(t => {
      if (typeFilter !== 'all' && t.teacherType !== typeFilter) return false
      if (statusFilter === 'active' && t.isPending) return false
      if (statusFilter === 'pending' && !t.isPending) return false
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
  }, [teachers, search, typeFilter, statusFilter])

  function handleRemove(teacher: TeacherListItem) {
    if (!confirm(`Retirer ${teacher.fullName ?? 'cet enseignant'} de l'école ?`)) return
    remove(teacher.id, {
      onSuccess: (result) => {
        if (!result.success) toast.error(result.error)
      },
    })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Enseignants"
        count={teachers?.length}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="border-green-600 text-green-700 hover:bg-green-50"
              onClick={() => teachers && exportTeachersToExcel(teachers)}
              disabled={!teachers?.length}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Télécharger en Excel
            </Button>
            <Button
              size="sm"
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
              onClick={() => setInviteOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Créer un nouvel enseignant
            </Button>
          </>
        }
      />

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Recherche */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un enseignant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Chips type */}
        <div className="flex gap-1.5">
          {([
            { value: 'all',       label: 'Tous' },
            { value: 'volunteer', label: 'Bénévoles' },
            { value: 'paid',      label: 'Payés' },
          ] as { value: TypeFilter; label: string }[]).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={cn(
                'h-7 px-3 rounded-full text-xs font-medium transition-colors border',
                typeFilter === value
                  ? value === 'volunteer' ? 'bg-purple-500 text-white border-purple-500'
                    : value === 'paid'      ? 'bg-green-500 text-white border-green-500'
                    : 'bg-foreground text-background border-foreground'
                  : 'bg-white text-muted-foreground border-border hover:border-foreground/30'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Chips statut */}
        <div className="flex gap-1.5">
          {([
            { value: 'all',     label: 'Tous' },
            { value: 'active',  label: 'Actifs' },
            { value: 'pending', label: 'En attente' },
          ] as { value: StatusFilter; label: string }[]).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={cn(
                'h-7 px-3 rounded-full text-xs font-medium transition-colors border',
                statusFilter === value
                  ? value === 'active'  ? 'bg-green-500 text-white border-green-500'
                    : value === 'pending' ? 'bg-orange-400 text-white border-orange-400'
                    : 'bg-foreground text-background border-foreground'
                  : 'bg-white text-muted-foreground border-border hover:border-foreground/30'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grille de cartes */}
      {isLoading ? (
        <TeachersSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Aucun enseignant trouvé' : 'Aucun enseignant pour le moment'}
          description={
            search
              ? 'Essayez un autre terme de recherche.'
              : 'Invitez votre premier enseignant par email.'
          }
          action={
            !search ? (
              <Button
                size="sm"
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
                onClick={() => setInviteOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Inviter un enseignant
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(teacher => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onEdit={() => router.push(`/admin-portal/teachers/${teacher.id}`)}
              onRemove={() => handleRemove(teacher)}
            />
          ))}
        </div>
      )}

      {/* Dialog invitation */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inviter un enseignant</DialogTitle>
          </DialogHeader>
          <TeacherInviteForm
            onSuccess={() => setInviteOpen(false)}
            onCancel={() => setInviteOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface TeacherCardProps {
  teacher: TeacherListItem
  onEdit: () => void
  onRemove: () => void
}

function TeacherCard({ teacher, onEdit, onRemove }: TeacherCardProps) {
  return (
    <div
      className="bg-white rounded-xl border border-border p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={onEdit}
    >
      {/* En-tête : avatar + nom + menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarImage src={teacher.avatarUrl ?? undefined} alt={teacher.fullName ?? ''} />
            <AvatarFallback className="bg-[#f9e8d8] text-[#7a4f30] font-semibold text-sm">
              {getInitials(teacher.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm leading-tight">
              {teacher.fullName ?? <span className="italic text-muted-foreground">Sans nom</span>}
            </p>
            {teacher.isPending && (
              <span className="text-xs text-orange-600 font-medium">En attente d'activation</span>
            )}
          </div>
        </div>

        <div onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onClick={onRemove}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Retirer de l'école
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Infos de contact */}
      <div className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 truncate">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{teacher.email}</span>
        </div>
        {teacher.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{teacher.phone}</span>
          </div>
        )}
      </div>

      {/* Badges pied de carte */}
      <div className="flex items-center justify-between pt-1 border-t border-border/60">
        <div className="flex gap-1.5 flex-wrap">
          {teacher.teacherType && (
            <StatusBadge status={teacher.teacherType} />
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          <span>{teacher.classCount} classe{teacher.classCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}

function TeachersSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-border p-5 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-muted" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
          <div className="h-3 bg-muted rounded w-1/3 pt-1" />
        </div>
      ))}
    </div>
  )
}
