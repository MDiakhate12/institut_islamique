'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRegistrations } from '@/modules/registrations/registrations.hooks'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardList, Pencil, Download, X, Trash2, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportRegistrationsToExcel } from './registrations.excel'
import type { RegistrationWithDetails } from '@/modules/registrations/registrations.types'

type TypeFilter = 'all' | 'new_student' | 'reenrollment'

function ConsentBadge({ value, label }: { value: boolean | null; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn(
        'inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold',
        value === true  ? 'bg-green-100 text-green-700' :
        value === false ? 'bg-red-50 text-red-600' :
        'bg-gray-100 text-gray-400'
      )}>
        {value === true ? 'Yes' : value === false ? 'No' : '—'}
      </span>
    </div>
  )
}

function ClassBadge({ code }: { code: string }) {
  const colorMap: Record<string, string> = {
    QRN: 'bg-green-100 text-green-700 border-green-200',
    ARA: 'bg-blue-100 text-blue-700 border-blue-200',
    ISL: 'bg-purple-100 text-purple-700 border-purple-200',
    NUR: 'bg-orange-100 text-orange-700 border-orange-200',
  }
  const subject = code.split('-')[0] ?? ''
  const cls = colorMap[subject] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border', cls)}>
      {code}
    </span>
  )
}

export function RegistrationsClient() {
  const { data: registrations, isLoading } = useRegistrations()

  const [search, setSearch]         = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [selected, setSelected]     = useState<RegistrationWithDetails | null>(null)

  const grades = useMemo(() => {
    const set = new Set((registrations ?? []).map(r => r.grade).filter((g): g is string => !!g))
    return Array.from(set).sort()
  }, [registrations])

  const years = useMemo(() => {
    const set = new Set<string>()
    ;(registrations ?? []).forEach(r => {
      const y = new Date(r.submittedAt).getFullYear()
      set.add(`${y}-${y + 1}`)
    })
    return Array.from(set).sort().reverse()
  }, [registrations])

  const filtered = useMemo(() => {
    if (!registrations) return []
    return registrations.filter(r => {
      if (gradeFilter !== 'all' && r.grade !== gradeFilter) return false
      if (typeFilter !== 'all' && r.formType !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const name = `${r.studentFirstName ?? ''} ${r.studentLastName ?? ''}`.toLowerCase()
        return name.includes(q) || (r.studentCustomId ?? '').toLowerCase().includes(q)
      }
      return true
    })
  }, [registrations, search, gradeFilter, typeFilter])

  const total = registrations?.length ?? 0

  // Detect custom field columns from the first registration
  const customFieldLabels = useMemo(() => {
    if (!registrations?.length) return []
    const labels = new Set<string>()
    registrations.forEach(r => r.customFields?.forEach(cf => labels.add(cf.label)))
    return Array.from(labels)
  }, [registrations])

  return (
    <div className="p-6 space-y-4">
      {/* ── En-tête ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#c2440f' }}>Inscriptions des élèves</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Afficher et gérer toutes les inscriptions des élèves</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin-portal/registration-forms"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#c2440f] hover:bg-[#a33a0d] text-white rounded-md transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Modifier les formulaires d&apos;inscription
          </Link>
          <button
            onClick={() => registrations && exportRegistrationsToExcel(registrations)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-green-600 text-green-700 hover:bg-green-50 rounded-md transition-colors"
          >
            <Download className="h-4 w-4" />
            Télécharger en Excel
          </button>
        </div>
      </div>

      {/* ── Recherche + filtres ── */}
      <div className="flex items-center flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Rechercher par nom ou ID étudiant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30"
          />
        </div>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none cursor-pointer min-w-[140px]">
          <option value="all">Tous les niveaux</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TypeFilter)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none cursor-pointer min-w-[150px]">
          <option value="all">Tous les types de...</option>
          <option value="new_student">Nouvel élève</option>
          <option value="reenrollment">Réinscription</option>
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none cursor-pointer min-w-[120px]">
          <option value="all">All Types</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {!isLoading && (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {total}
          </span>
        )}
      </div>

      {/* ── Tableau + panneau détail ── */}
      <div className="flex gap-4 relative">
        <div className={cn('flex-1 min-w-0 rounded-lg border border-border bg-white overflow-hidden', selected && 'lg:max-w-[calc(100%-380px)]')}>
          {isLoading ? <RegistrationsSkeleton /> : filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={search ? 'Aucune inscription trouvée' : 'Aucune inscription pour le moment'}
              description={search ? 'Essayez un autre terme.' : 'Les inscriptions soumises par les parents apparaîtront ici.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground uppercase tracking-wide">
                    <SortableTh label="ID" />
                    <SortableTh label="Student" />
                    <SortableTh label="Registered At" />
                    <th className="px-3 py-3 text-left">Parents</th>
                    <th className="px-3 py-3 text-left">Contact</th>
                    <SortableTh label="DOB" />
                    <SortableTh label="Grade" />
                    <th className="px-3 py-3 text-left">Old Classes</th>
                    <th className="px-3 py-3 text-left min-w-[160px]">Classes</th>
                    <SortableTh label="Tuition" />
                    <th className="px-3 py-3 text-left">Tenant</th>
                    <th className="px-3 py-3 text-left">Consents</th>
                    {customFieldLabels.map(label => (
                      <th key={label} className="px-3 py-3 text-left max-w-[140px] truncate">{label}</th>
                    ))}
                    <th className="px-3 py-3 text-left w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <RegistrationRow
                      key={r.id}
                      registration={r}
                      customFieldLabels={customFieldLabels}
                      isSelected={selected?.id === r.id}
                      onClick={() => setSelected(prev => prev?.id === r.id ? null : r)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Panneau détail ── */}
        {selected && (
          <RegistrationDetailPanel
            registration={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  )
}

function SortableTh({ label }: { label: string }) {
  return (
    <th className="px-3 py-3 text-left">
      <button className="flex items-center gap-1 hover:text-foreground transition-colors">
        {label} <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  )
}

function RegistrationRow({
  registration: r,
  customFieldLabels,
  isSelected,
  onClick,
}: {
  registration: RegistrationWithDetails
  customFieldLabels: string[]
  isSelected: boolean
  onClick: () => void
}) {
  const father = r.parents[0]
  const mother = r.parents[1]

  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-border/50 last:border-0 cursor-pointer transition-colors',
        isSelected ? 'bg-orange-50' : 'hover:bg-muted/10'
      )}
    >
      {/* ID */}
      <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">
        {r.studentCustomId ?? '—'}
      </td>

      {/* Student */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="font-medium text-foreground">{r.studentFirstName} {r.studentLastName}</span>
          {r.formType === 'new_student' && (
            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase">NEW</span>
          )}
        </div>
      </td>

      {/* Registered At */}
      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        {new Date(r.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>

      {/* Parents */}
      <td className="px-3 py-2.5">
        <div className="space-y-0.5">
          {father && (
            <div className="flex items-center gap-1 text-xs">
              <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span>{father.name}</span>
            </div>
          )}
          {mother && (
            <div className="flex items-center gap-1 text-xs">
              <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span>{mother.name}</span>
            </div>
          )}
        </div>
      </td>

      {/* Contact */}
      <td className="px-3 py-2.5">
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {r.parents[0]?.email && (
            <div className="flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <span>{r.parents[0].email}</span>
            </div>
          )}
          {r.parents[0]?.phone && (
            <div className="flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              <span>{r.parents[0].phone}</span>
            </div>
          )}
        </div>
      </td>

      {/* DOB */}
      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        {r.studentBirthDate
          ? new Date(r.studentBirthDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—'}
      </td>

      {/* Grade */}
      <td className="px-3 py-2.5 text-xs">
        {r.grade ? <span className="text-[#c2440f] font-medium">{r.grade}</span> : <span className="text-muted-foreground">—</span>}
      </td>

      {/* Old Classes */}
      <td className="px-3 py-2.5 text-xs text-muted-foreground">—</td>

      {/* Classes */}
      <td className="px-3 py-2.5">
        {r.classes.length === 0 ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {r.classes.map(c => <ClassBadge key={c.fullCode} code={c.fullCode} />)}
          </div>
        )}
      </td>

      {/* Tuition */}
      <td className="px-3 py-2.5">
        <div className="text-xs">
          {r.paymentFrequency && <p className="font-medium">{r.paymentFrequency}</p>}
          {r.financialAid && r.financialAid !== 'No, thank you!' && (
            <p className="text-emerald-600">{r.financialAid}</p>
          )}
          {r.financialAid === 'No, thank you!' && (
            <p className="text-muted-foreground">No, thank you!</p>
          )}
        </div>
      </td>

      {/* Tenant (School / Year) */}
      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">Attawba</p>
          <p>{new Date(r.submittedAt).getFullYear()}-{new Date(r.submittedAt).getFullYear() + 1}</p>
        </div>
      </td>

      {/* Consents */}
      <td className="px-3 py-2.5">
        <div className="space-y-0.5">
          <ConsentBadge value={r.photoConsent} label="Photo" />
          <ConsentBadge value={r.policyConsent} label="Policy" />
        </div>
      </td>

      {/* Custom fields */}
      {customFieldLabels.map(label => {
        const cf = r.customFields?.find(f => f.label === label)
        return (
          <td key={label} className="px-3 py-2.5 text-xs text-muted-foreground max-w-[140px] truncate">
            {cf?.value ?? '—'}
          </td>
        )
      })}

      {/* Delete */}
      <td className="px-3 py-2.5">
        <button
          onClick={e => e.stopPropagation()}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

function RegistrationDetailPanel({
  registration: r,
  onClose,
}: {
  registration: RegistrationWithDetails
  onClose: () => void
}) {
  const father = r.parents[0]
  const mother = r.parents[1]

  return (
    <div className="w-[340px] shrink-0 rounded-lg border border-border bg-white overflow-y-auto max-h-[calc(100vh-200px)] sticky top-0">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <div>
          <h2 className="font-semibold text-foreground">{r.studentFirstName} {r.studentLastName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground font-mono">#{r.studentCustomId}</span>
            {r.formType === 'new_student' && (
              <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase">NEW</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registered {new Date(r.submittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-5 text-sm">

        {/* Student Info */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Student Info</h3>
          <div className="space-y-1.5">
            <Row icon="📅" label="Date of Birth" value={r.studentBirthDate
              ? new Date(r.studentBirthDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'} />
            <Row icon="●" label="Gender" value={r.studentGender === 'male' ? 'Male' : r.studentGender === 'female' ? 'Female' : '—'} dot={r.studentGender === 'male' ? 'blue' : r.studentGender === 'female' ? 'pink' : undefined} />
            <Row icon="🎓" label="Grade" value={r.grade ?? '—'} highlight />
          </div>
        </section>

        {/* Parents / Guardians */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Parents / Guardians</h3>
          <div className="space-y-1.5">
            {father && <Row icon="👤" label="Father" value={father.name} />}
            {mother && <Row icon="👤" label="Mother" value={mother.name} />}
            {!father && !mother && <p className="text-xs text-muted-foreground">—</p>}
          </div>
        </section>

        {/* Contact */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Contact</h3>
          <div className="space-y-1.5">
            {r.parents[0]?.email && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">Primary Email</span>
                <a href={`mailto:${r.parents[0].email}`} className="text-blue-600 text-xs hover:underline">{r.parents[0].email}</a>
              </div>
            )}
            {r.parents[0]?.phone && <Row icon="" label="Primary Phone" value={r.parents[0].phone} />}
          </div>
        </section>

        {/* Classes */}
        {r.classes.length > 0 && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Classes</h3>
            <p className="text-[11px] text-muted-foreground mb-1.5">Registered</p>
            <div className="flex flex-wrap gap-1.5">
              {r.classes.map(c => <ClassBadge key={c.fullCode} code={c.fullCode} />)}
            </div>
          </section>
        )}

        {/* Tuition & Financial */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Tuition & Financial</h3>
          <div className="space-y-1.5">
            <Row icon="$" label="Tuition Type" value={r.paymentFrequency ?? '—'} />
            <Row icon="" label="Financial Assistance" value={r.financialAid ?? '—'} />
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">Photo Permission</span>
              <ConsentBadge value={r.photoConsent} label="" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">Policy Acknowledgment</span>
              <ConsentBadge value={r.policyConsent} label="" />
            </div>
          </div>
        </section>

        {/* Enrollment Info */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Enrollment Info</h3>
          <div className="space-y-1.5">
            <Row icon="🏫" label="School" value="Attawba" />
            <Row icon="#" label="Year" value={`${new Date(r.submittedAt).getFullYear()}-${new Date(r.submittedAt).getFullYear() + 1}`} />
          </div>
        </section>

        {/* Custom form fields */}
        {r.customFields && r.customFields.length > 0 && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Informations de l&apos;étudiant</h3>
            <div className="space-y-2">
              {r.customFields.map((cf, i) => (
                <div key={i} className="text-xs">
                  <p className="text-muted-foreground">{cf.label}</p>
                  <p className="font-medium mt-0.5 p-2 bg-muted/20 rounded border border-border/50">{cf.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function Row({ icon, label, value, highlight, dot }: {
  icon: string
  label: string
  value: string
  highlight?: boolean
  dot?: 'blue' | 'pink'
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex items-center gap-1.5">
        {dot && (
          <span className={cn('h-2.5 w-2.5 rounded-full', dot === 'blue' ? 'bg-blue-500' : 'bg-pink-400')} />
        )}
        <span className={cn('text-xs', highlight ? 'text-[#c2440f] font-medium' : 'font-medium text-foreground')}>
          {value}
        </span>
      </div>
    </div>
  )
}

function RegistrationsSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            {Array.from({ length: 10 }).map((_, i) => (
              <th key={i} className="px-3 py-3"><Skeleton className="h-3 w-20" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-border/50">
              {Array.from({ length: 10 }).map((_, j) => (
                <td key={j} className="px-3 py-3"><Skeleton className="h-4 w-full" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
