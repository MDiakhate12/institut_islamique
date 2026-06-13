'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useStudents, useDeactivateStudent } from '@/modules/students/students.hooks'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Users, Plus, Download, MoreHorizontal, Pencil, UserX, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportStudentsToExcel } from './students.excel'
import type { StudentListItem } from '@/modules/students/students.types'

type GenderFilter = 'all' | 'male' | 'female'
type ActiveFilter = 'all' | 'active' | 'inactive'

export function StudentsClient() {
  const router = useRouter()
  const { data: students, isLoading } = useStudents()
  const { mutate: deactivate } = useDeactivateStudent()

  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')

  const filtered = useMemo(() => {
    if (!students) return []
    return students.filter(s => {
      if (genderFilter !== 'all' && s.gender !== genderFilter) return false
      if (activeFilter === 'active' && !s.isActive) return false
      if (activeFilter === 'inactive' && s.isActive) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [students, search, genderFilter, activeFilter])

  function handleDeactivate(student: StudentListItem) {
    deactivate(student.id, {
      onSuccess: (result) => {
        if (!result.success) toast.error(result.error)
      },
    })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Élèves"
        count={students?.length}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="border-green-600 text-green-700 hover:bg-green-50"
              onClick={() => students && exportStudentsToExcel(students)}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Télécharger en Excel
            </Button>
            <Button
              size="sm"
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
              onClick={() => router.push('/admin-portal/students/new')}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Créer un nouvel élève
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
            placeholder="Rechercher un élève..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Chips genre */}
        <div className="flex gap-1.5">
          {(['all', 'male', 'female'] as GenderFilter[]).map(g => (
            <button
              key={g}
              onClick={() => setGenderFilter(g)}
              className={cn(
                'h-7 px-3 rounded-full text-xs font-medium transition-colors border',
                genderFilter === g
                  ? g === 'male' ? 'bg-blue-500 text-white border-blue-500'
                    : g === 'female' ? 'bg-pink-500 text-white border-pink-500'
                    : 'bg-foreground text-background border-foreground'
                  : 'bg-white text-muted-foreground border-border hover:border-foreground/30'
              )}
            >
              {g === 'all' ? 'Tous' : g === 'male' ? 'Garçons' : 'Filles'}
            </button>
          ))}
        </div>

        {/* Chips actif */}
        <div className="flex gap-1.5">
          {(['all', 'active', 'inactive'] as ActiveFilter[]).map(a => (
            <button
              key={a}
              onClick={() => setActiveFilter(a)}
              className={cn(
                'h-7 px-3 rounded-full text-xs font-medium transition-colors border',
                activeFilter === a
                  ? a === 'active' ? 'bg-green-500 text-white border-green-500'
                    : a === 'inactive' ? 'bg-red-400 text-white border-red-400'
                    : 'bg-foreground text-background border-foreground'
                  : 'bg-white text-muted-foreground border-border hover:border-foreground/30'
              )}
            >
              {a === 'all' ? 'Tous' : a === 'active' ? 'Inscrits' : 'Inactifs'}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      {isLoading ? (
        <StudentsSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Aucun élève trouvé' : 'Aucun élève pour le moment'}
          description={search ? 'Essayez un autre terme de recherche.' : 'Commencez par créer votre premier élève.'}
          action={
            !search ? (
              <Button
                size="sm"
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
                onClick={() => router.push('/admin-portal/students/new')}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Créer un élève
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Nom</TableHead>
                <TableHead className="font-semibold">Genre</TableHead>
                <TableHead className="font-semibold">Date de naissance</TableHead>
                <TableHead className="font-semibold">Classe</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(student => (
                <TableRow
                  key={student.id}
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() => router.push(`/admin-portal/students/${student.id}`)}
                >
                  <TableCell className="font-medium">
                    {student.lastName} {student.firstName}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={student.gender} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {student.birthDate
                      ? new Date(student.birthDate).toLocaleDateString('fr-FR')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {student.activeClassName ?? (
                      <span className="text-muted-foreground italic">Non inscrit</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={student.isActive ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => router.push(`/admin-portal/students/${student.id}`)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => handleDeactivate(student)}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Désactiver
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function StudentsSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            {['Nom', 'Genre', 'Date de naissance', 'Classe', 'Statut', ''].map(h => (
              <TableHead key={h} className="font-semibold">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 6 }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
