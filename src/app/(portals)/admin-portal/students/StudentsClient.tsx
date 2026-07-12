'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useStudents, useDeactivateStudent } from '@/modules/students/students.hooks'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Plus, Download, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportStudentsToExcel } from './students.excel'
import { StudentFormDialog } from './StudentForm'
import type { StudentListItem } from '@/modules/students/students.types'

type GenderFilter = 'all' | 'male' | 'female'
type ActiveFilter = 'all' | 'active' | 'inactive'
type SortKey = 'name' | 'birthDate' | null

function calcAge(birthDate: string | null | undefined): string {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  const now = new Date()
  const totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  return `${Math.floor(totalMonths / 12)}a ${totalMonths % 12}m`
}

export function StudentsClient() {
  const { data: students, isLoading } = useStudents()
  const { mutate: deactivate } = useDeactivateStudent()

  const [search, setSearch]             = useState('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [sortKey, setSortKey]           = useState<SortKey>(null)
  const [sortAsc, setSortAsc]           = useState(true)

  const filtered = useMemo(() => {
    if (!students) return []
    let list = students.filter(s => {
      if (genderFilter !== 'all' && s.gender !== genderFilter) return false
      if (activeFilter === 'active'   && !s.isActive) return false
      if (activeFilter === 'inactive' && s.isActive)  return false
      if (search) {
        const q = search.toLowerCase()
        const guardianMatch = s.guardians.some(g =>
          (g.phone ?? '').includes(q) ||
          (g.email ?? '').toLowerCase().includes(q) ||
          g.firstName.toLowerCase().includes(q)
        )
        return (
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          (s.studentCustomId ?? '').toLowerCase().includes(q) ||
          guardianMatch
        )
      }
      return true
    })
    if (sortKey === 'name') {
      list = [...list].sort((a, b) =>
        (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName) * (sortAsc ? 1 : -1)
      )
    } else if (sortKey === 'birthDate') {
      list = [...list].sort((a, b) =>
        ((a.birthDate ?? '') < (b.birthDate ?? '') ? -1 : 1) * (sortAsc ? 1 : -1)
      )
    }
    return list
  }, [students, search, genderFilter, activeFilter, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(true) }
  }

  function handleDeactivate(id: string) {
    deactivate(id, { onSuccess: r => { if (!r.success) toast.error(r.error) } })
  }

  const total = students?.length ?? 0

  return (
    <div className="p-6 space-y-4">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Élèves</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gérer les inscriptions et les profils des élèves</p>
          {!isLoading && <p className="text-xs text-muted-foreground mt-1">{total} élève{total !== 1 ? 's' : ''}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline" size="sm"
            className="border-green-600 text-green-700 hover:bg-green-50 gap-1.5"
            onClick={() => students && exportStudentsToExcel(students)}
          >
            <Download className="h-4 w-4" />
            Télécharger en Excel
          </Button>
          <StudentFormDialog
            trigger={
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#c2440f] hover:bg-[#a33a0d] text-white rounded-md transition-colors">
                <Plus className="h-4 w-4" />
                Créer un nouvel élève
              </button>
            }
          />
        </div>
      </div>

      {/* ── Recherche ── */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          type="text"
          placeholder="Rechercher des élèves, numéros de téléphone, identifiants, IDs de classe..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30 focus:border-[#c2440f]/50"
        />
      </div>

      {/* ── Dropdowns + chips ── */}
      <div className="flex items-center flex-wrap gap-3">
        <select className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none cursor-pointer">
          <option>Toutes les années</option>
          <option>2025-2026</option><option>2024-2025</option>
        </select>
        {[1, 2, 3].map(t => (
          <select key={t} className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none cursor-pointer">
            <option>Trimestre {t} : Tous les statuts</option>
            <option>Trimestre {t} : Payé</option>
            <option>Trimestre {t} : Non payé</option>
          </select>
        ))}
        {/* Chips genre */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Genre :</span>
          <button onClick={() => setGenderFilter(genderFilter === 'male' ? 'all' : 'male')} title="Garçons"
            className={cn('h-5 w-5 rounded-full border-2 transition-all', genderFilter === 'male' ? 'bg-blue-500 border-blue-500' : 'border-blue-400 bg-white')} />
          <button onClick={() => setGenderFilter(genderFilter === 'female' ? 'all' : 'female')} title="Filles"
            className={cn('h-5 w-5 rounded-full border-2 transition-all', genderFilter === 'female' ? 'bg-pink-400 border-pink-400' : 'border-pink-400 bg-white')} />
        </div>
        {/* Chips inscrit */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Inscrit :</span>
          <button onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')} title="Inscrits"
            className={cn('h-5 w-5 rounded-full border-2 transition-all', activeFilter === 'active' ? 'bg-green-500 border-green-500' : 'border-green-400 bg-white')} />
          <button onClick={() => setActiveFilter(activeFilter === 'inactive' ? 'all' : 'inactive')} title="Non inscrits"
            className={cn('h-5 w-5 rounded-full border-2 transition-all', activeFilter === 'inactive' ? 'bg-red-400 border-red-400' : 'border-red-400 bg-white')} />
        </div>
        <select className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white focus:outline-none cursor-pointer">
          <option>Âge</option>
        </select>
      </div>

      {/* ── Tableau ── */}
      {isLoading ? <StudentsSkeleton /> : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Aucun élève trouvé' : 'Aucun élève pour le moment'}
          description={search ? 'Essayez un autre terme.' : 'Créez votre premier élève.'}
          action={!search ? (
            <StudentFormDialog
              trigger={
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#c2440f] hover:bg-[#a33a0d] text-white rounded-md transition-colors">
                  <Plus className="h-4 w-4" /> Créer un élève
                </button>
              }
            />
          ) : undefined}
        />
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-3 py-3 text-left w-8">#</th>
                  <SortTh label="Nom de l'élève" onClick={() => toggleSort('name')} />
                  <th className="px-3 py-3 text-left">Étoiles</th>
                  <th className="px-3 py-3 text-left">Trophée</th>
                  <SortTh label="Date de naissance" onClick={() => toggleSort('birthDate')} />
                  <th className="px-3 py-3 text-left min-w-[160px]">Nom du parent 1</th>
                  <th className="px-3 py-3 text-left min-w-[160px]">Nom du parent 2</th>
                  <th className="px-3 py-3 text-left">Nb. classes</th>
                  <th className="px-3 py-3 text-left min-w-[100px]">Classes</th>
                  <th className="px-3 py-3 text-left">Trimestre 1</th>
                  <th className="px-3 py-3 text-left">Trimestre 2</th>
                  <th className="px-3 py-3 text-left">Trimestre 3</th>
                  <th className="px-3 py-3 text-left">Statut</th>
                  <th className="px-3 py-3 text-left">Présent</th>
                  <th className="px-3 py-3 text-left">En retard</th>
                  <th className="px-3 py-3 text-left">Absent</th>
                  <th className="px-3 py-3 text-left">Excusé</th>
                  <th className="px-3 py-3 text-left min-w-[110px]">Année d&apos;inscription</th>
                  <th className="px-3 py-3 text-left min-w-[110px]">Date d&apos;adhésion</th>
                  <th className="px-3 py-3 text-left min-w-[120px]">Dernière présence</th>
                  <th className="px-3 py-3 text-left min-w-[130px]">Numéro d&apos;urgence</th>
                  <th className="px-3 py-3 text-left min-w-[180px]">Commentaire</th>
                  <th className="px-3 py-3 text-left min-w-[280px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <StudentRow key={s.id} student={s} index={i} onDeactivate={handleDeactivate} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SortTh({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="px-3 py-3 text-left font-semibold min-w-[180px]">
      <button onClick={onClick} className="flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wide text-xs">
        {label} <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  )
}

function PaymentBadge({ paid }: { paid: boolean }) {
  return (
    <span className={cn(
      'inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium',
      paid
        ? 'bg-green-100 text-green-700 border border-green-200'
        : 'bg-red-50 text-red-600 border border-red-200'
    )}>
      {paid ? 'Payé' : 'Non payé'}
    </span>
  )
}

function StudentRow({ student: s, index, onDeactivate }: {
  student: StudentListItem
  index: number
  onDeactivate: (id: string) => void
}) {
  const father = s.guardians.find(g => g.relationship === 'father' || g.isPrimary)
  const mother = s.guardians.find(g => g.relationship === 'mother') ?? s.guardians.find(g => !g.isPrimary)

  const emergencyPhone = father?.emergencyPhone
    ?? s.guardians.find(g => g.emergencyPhone)?.emergencyPhone

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
      <td className="px-3 py-3 text-muted-foreground text-xs">{index + 1}.</td>

      {/* Nom + ID */}
      <td className="px-3 py-3">
        <div className="flex items-start gap-2">
          <div className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', s.isActive ? 'bg-blue-500' : 'bg-gray-300')} />
          <div>
            <p className="font-semibold text-foreground">{s.lastName} {s.firstName}</p>
            {s.studentCustomId && (
              <p className="text-xs text-muted-foreground mt-0.5">ID : {s.studentCustomId}</p>
            )}
          </div>
        </div>
      </td>

      {/* Étoiles */}
      <td className="px-3 py-3"><span className="text-amber-500">⭐</span> 0</td>

      {/* Trophée */}
      <td className="px-3 py-3 text-muted-foreground text-xs italic">Pas encore</td>

      {/* Date naissance */}
      <td className="px-3 py-3">
        {s.birthDate ? (
          <div>
            <p className="font-medium">{calcAge(s.birthDate)}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(s.birthDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ) : <span className="text-muted-foreground">—</span>}
      </td>

      {/* Nom du parent 1 (père) */}
      <td className="px-3 py-3">
        {father ? (
          <div>
            <p className="font-medium text-xs">{father.firstName} {father.lastName}</p>
            {father.email && <p className="text-xs text-muted-foreground">{father.email}</p>}
            {father.phone && <p className="text-xs text-muted-foreground">{father.phone}</p>}
          </div>
        ) : <span className="text-muted-foreground text-xs italic">—</span>}
      </td>

      {/* Nom du parent 2 (mère) */}
      <td className="px-3 py-3">
        {mother ? (
          <div>
            <p className="font-medium text-xs">{mother.firstName} {mother.lastName}</p>
            {mother.email && <p className="text-xs text-muted-foreground">{mother.email}</p>}
          </div>
        ) : <span className="text-muted-foreground text-xs italic">—</span>}
      </td>

      {/* Nb classes */}
      <td className="px-3 py-3 text-center">
        <span className="font-medium">{s.activeClassId ? '1' : '0'}</span>
        <span className="text-xs text-muted-foreground ml-1">classe</span>
      </td>

      {/* Classe */}
      <td className="px-3 py-3">
        {s.activeClassName
          ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">{s.activeClassName}</span>
          : <span className="text-muted-foreground text-xs italic">Aucune classe</span>}
      </td>

      {/* Paiements T1/T2/T3 */}
      <td className="px-3 py-3"><PaymentBadge paid={s.paymentT1} /></td>
      <td className="px-3 py-3"><PaymentBadge paid={s.paymentT2} /></td>
      <td className="px-3 py-3"><PaymentBadge paid={s.paymentT3} /></td>

      {/* Statut */}
      <td className="px-3 py-3">
        <span className={cn(
          'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
          s.isActive ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
        )}>
          {s.isActive ? 'Inscrit' : 'Inactif'}
        </span>
      </td>

      {/* Présences (placeholder) */}
      <td className="px-3 py-3 text-center">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">0</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-semibold">0</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold">0</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-semibold">0</span>
      </td>

      {/* Année inscription */}
      <td className="px-3 py-3 text-xs">{s.academicYear ?? '—'}</td>

      {/* Date adhésion */}
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {s.enrolledAt
          ? new Date(s.enrolledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
          : new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>

      {/* Dernière présence */}
      <td className="px-3 py-3 text-xs text-muted-foreground">Jamais</td>

      {/* Numéro d'urgence */}
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {emergencyPhone ?? 'Non renseigné'}
      </td>

      {/* Notes / Commentaire */}
      <td className="px-3 py-3">
        <label className="flex items-start gap-1.5 cursor-pointer">
          <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 rounded border-border" readOnly checked={false} />
          <span className="text-xs text-muted-foreground">
            {s.notes ?? 'Cliquer pour ajouter un commentaire'}
          </span>
        </label>
      </td>

      {/* Actions */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <ActionBtn label="Bulletin de notes" color="blue"   />
          <ActionBtn label="Présences de l'élève" color="orange" />
          <ActionBtn label="Paiements"          color="green" />
          <ActionBtn label="Devoirs"            color="purple" />
          <StudentFormDialog
            student={s}
            trigger={
              <button className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-muted transition-colors ml-0.5">
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M4 16l-.5 4 4-.5 9.293-9.293-3.536-3.536L4 16z" />
                </svg>
              </button>
            }
          />
        </div>
      </td>
    </tr>
  )
}

function ActionBtn({ label, color }: { label: string; color: 'blue' | 'green' | 'orange' | 'purple' }) {
  const cls = {
    blue:   'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
    green:  'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
    orange: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
    purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  }[color]
  return (
    <button className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium transition-colors', cls)}>
      {label}
    </button>
  )
}

function StudentsSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {Array.from({ length: 14 }).map((_, i) => (
                <th key={i} className="px-3 py-3"><Skeleton className="h-3 w-20" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {Array.from({ length: 14 }).map((_, j) => (
                  <td key={j} className="px-3 py-3"><Skeleton className="h-4 w-full" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
