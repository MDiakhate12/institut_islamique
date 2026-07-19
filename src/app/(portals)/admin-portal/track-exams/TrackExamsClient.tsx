'use client'

import { useState, useMemo } from 'react'
import {
  GraduationCap, Search, Settings, Mail, FileText,
  ChevronDown, ChevronUp, AlertTriangle, Copy, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAdminExamClasses, useAdminExamStudents } from '@/modules/exams/exams.hooks'
import type { AdminExamClassProgress, AdminExamStudentProgress } from '@/modules/exams/exams.types'

interface Props {
  initialClasses: AdminExamClassProgress[]
  initialStudents: AdminExamStudentProgress[]
  initialTrimester: number
  academicYear: string
  examPeriodT1Open: boolean
  examPeriodT2Open: boolean
  examPeriodT3Open: boolean
  schoolName: string
}

type ViewTab = 'class' | 'student' | 'completion' | 'type'
type SortOption = 'name-az' | 'name-za' | 'completion-asc' | 'completion-desc' | 'score-asc' | 'score-desc'

// ── Helpers ──────────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-[#c2440f] rounded-full transition-all"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

// ── Class card ────────────────────────────────────────────────────────────────

function ClassCard({ cls }: { cls: AdminExamClassProgress }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-[#7a4f30]">{cls.className}</p>
            {cls.teacherName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <span className="h-3.5 w-3.5 rounded-full bg-gray-200 inline-flex items-center justify-center text-[10px]">👤</span>
                {cls.teacherName}
              </div>
            )}
            {cls.catalogCode && (
              <p className="text-xs text-muted-foreground">ID : {cls.catalogCode}</p>
            )}
          </div>
          <span className={cn(
            'shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
            cls.percentage === 100 ? 'bg-green-100 text-green-700' :
            cls.percentage > 0 ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-600',
          )}>
            {cls.percentage}% fait
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Noté', value: cls.gradedCount, color: 'text-[#c2440f]' },
            { label: 'Total', value: cls.totalStudents, color: 'text-gray-800' },
            { label: 'En attente', value: cls.pendingCount, color: 'text-amber-600' },
            { label: 'Signé', value: `${cls.signedCount}/${cls.totalSignable}`, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <ProgressBar value={cls.percentage} />

        {/* Accordion toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Masquer les détails</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Voir les détails</>
          )}
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="space-y-3 pt-1">
            {cls.pendingStudents.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
                  En attente ({cls.pendingStudents.length})
                </p>
                {cls.pendingStudents.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-red-50 text-xs">
                    <span className="text-gray-700">{s.name}</span>
                    {s.customId && <span className="text-muted-foreground">{s.customId}</span>}
                  </div>
                ))}
              </div>
            )}
            {cls.gradedStudents.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                  Noté ({cls.gradedStudents.length})
                </p>
                {cls.gradedStudents.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-green-50 text-xs">
                    <span className="text-gray-700">{s.name}</span>
                    <span className={s.isSigned ? 'text-green-600' : 'text-muted-foreground'}>
                      {s.isSigned ? 'Signé' : 'Non signé'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Student card ──────────────────────────────────────────────────────────────

function StudentCard({ student }: { student: AdminExamStudentProgress }) {
  const completionPct = student.totalClasses > 0
    ? Math.round((student.gradedClasses / student.totalClasses) * 100)
    : 0

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-800">{student.firstName} {student.lastName}</p>
          {student.studentCustomId && (
            <p className="text-xs text-muted-foreground">{student.studentCustomId}</p>
          )}
        </div>
        {student.averageScore !== null && (
          <span className="shrink-0 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">
            Note moyenne : {student.averageScore}%
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progression</span>
          <span>{student.gradedClasses} / {student.totalClasses} Classes</span>
        </div>
        {student.totalClasses > 0 && (
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', completionPct === 100 ? 'bg-green-500' : 'bg-[#c2440f]')}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        )}
      </div>

      {student.classes.map(cls => (
        <div key={cls.classId} className="flex items-center justify-between text-xs">
          <div>
            <p className="text-gray-700 font-medium">{cls.className}</p>
            {cls.classCode && <p className="text-muted-foreground">{cls.classCode}</p>}
          </div>
          <span className={cn(
            'px-2 py-0.5 rounded-full font-medium',
            cls.isGraded ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
          )}>
            {cls.isGraded ? 'Noté' : 'En attente'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Email report dialog ────────────────────────────────────────────────────────

function EmailReportDialog({
  classes,
  schoolName,
  trimester,
  academicYear,
  onClose,
}: {
  classes: AdminExamClassProgress[]
  schoolName: string
  trimester: number
  academicYear: string
  onClose: () => void
}) {
  const pendingLines = classes
    .filter(c => c.pendingCount > 0)
    .map(c => `• ${c.teacherName ?? 'Enseignant'}: ${c.className} (${c.catalogCode ?? ''}) — ${c.gradedCount}/${c.totalStudents} noté`)
    .join('\n')

  const body = `Assalamo Alykom chers enseignants,

Nous souhaitons vous rappeler respectueusement de mettre à jour les notes d'examen pour vos classes.

${pendingLines}

${schoolName}
Jazakom allahu khayrn`

  function copyToClipboard() {
    navigator.clipboard.writeText(body)
    toast.success('Copié dans le presse-papiers')
  }

  function openMailto() {
    window.open(`mailto:?subject=Notes d'examen - Trimestre ${trimester} ${academicYear}&body=${encodeURIComponent(body)}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Rapport par e-mail</h2>
          <p className="text-sm text-muted-foreground">Vérifiez le contenu de l&apos;e-mail généré ci-dessous.</p>
        </div>
        <div className="p-6">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {body}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors">
            Annuler
          </button>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Copier dans le presse-papiers
          </button>
          <button
            onClick={openMailto}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#c2440f] text-white hover:bg-[#a33a0d] transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ouvrir dans le client e-mail
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function TrackExamsClient({
  initialClasses, initialStudents, initialTrimester, academicYear,
  examPeriodT1Open, examPeriodT2Open, examPeriodT3Open, schoolName,
}: Props) {
  const [trimester, setTrimester] = useState(initialTrimester)
  const [activeTab, setActiveTab] = useState<ViewTab>('class')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('name-az')
  const [showEmail, setShowEmail] = useState(false)

  const { data: classes = initialClasses } = useAdminExamClasses(trimester)
  const { data: students = initialStudents } = useAdminExamStudents(trimester)

  const examPeriodOpen = trimester === 1 ? examPeriodT1Open : trimester === 2 ? examPeriodT2Open : examPeriodT3Open

  const TABS: { key: ViewTab; label: string }[] = [
    { key: 'class', label: 'Par classe' },
    { key: 'student', label: 'Par élève' },
    { key: 'completion', label: 'Complétion' },
    { key: 'type', label: 'Type' },
  ]

  const totalStudents = useMemo(() => {
    const ids = new Set(students.map(s => s.studentId))
    return ids.size
  }, [students])

  const filteredClasses = useMemo(() => {
    if (!search) return classes
    const q = search.toLowerCase()
    return classes.filter(c =>
      c.className.toLowerCase().includes(q) ||
      (c.teacherName ?? '').toLowerCase().includes(q) ||
      (c.catalogCode ?? '').toLowerCase().includes(q)
    )
  }, [classes, search])

  const filteredStudents = useMemo(() => {
    let list = [...students]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        (s.studentCustomId ?? '').toLowerCase().includes(q)
      )
    }
    switch (sort) {
      case 'name-az': list.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)); break
      case 'name-za': list.sort((a, b) => `${b.lastName} ${b.firstName}`.localeCompare(`${a.lastName} ${a.firstName}`)); break
      case 'completion-asc': list.sort((a, b) => (a.gradedClasses / (a.totalClasses || 1)) - (b.gradedClasses / (b.totalClasses || 1))); break
      case 'completion-desc': list.sort((a, b) => (b.gradedClasses / (b.totalClasses || 1)) - (a.gradedClasses / (a.totalClasses || 1))); break
      case 'score-asc': list.sort((a, b) => (a.averageScore ?? -1) - (b.averageScore ?? -1)); break
      case 'score-desc': list.sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1)); break
    }
    return list
  }, [students, search, sort])

  const isClassTab = activeTab === 'class' || activeTab === 'completion' || activeTab === 'type'
  const displayedClasses = isClassTab ? filteredClasses : []
  const displayedStudents = activeTab === 'student' ? filteredStudents : []

  const subtitleCount = isClassTab
    ? `${classes.length} Classe${classes.length !== 1 ? 's' : ''}`
    : `${totalStudents} Élève${totalStudents !== 1 ? 's' : ''}`

  return (
    <div className="p-6 space-y-5">
      {/* Closed period banner */}
      {!examPeriodOpen && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Période d&apos;examens fermée</p>
            <p className="text-xs text-amber-700 mt-0.5">
              La période d&apos;examens est actuellement fermée. Les enseignants et les parents ne peuvent pas voir les boutons d&apos;examens et de notes dans leur portail.
            </p>
          </div>
          <a
            href="/admin-portal/school-settings"
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-amber-800 border border-amber-300 rounded-lg px-2.5 py-1 hover:bg-amber-100 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Activer dans les paramètres
          </a>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#7a4f30]">Suivre les notes d&apos;examen</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {academicYear} • {subtitleCount}
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map(t => (
                <button
                  key={t}
                  onClick={() => { setTrimester(t); setSearch('') }}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-full transition-colors',
                    trimester === t
                      ? 'bg-[#c2440f] text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50',
                  )}
                >
                  T{t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Résumé PDF
          </button>
          <button
            onClick={() => setShowEmail(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Rapport par email
          </button>
        </div>
      </div>

      {/* Tabs + search + sort */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isClassTab ? 'Rechercher des classes ou des enseignants...' : 'Rechercher des élèves...'}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
          />
        </div>
        <div className="flex items-center gap-2">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch('') }}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-[#c2440f] text-white'
                  : 'border border-gray-200 hover:bg-gray-50 text-gray-700',
              )}
            >
              {tab.label}
            </button>
          ))}
          {activeTab === 'student' && (
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="name-az">Nom (A-Z)</option>
              <option value="name-za">Nom (Z-A)</option>
              <option value="completion-asc">Complétion (croissant)</option>
              <option value="completion-desc">Complétion (décroissant)</option>
              <option value="score-asc">Note moyenne (croissant)</option>
              <option value="score-desc">Note moyenne (décroissant)</option>
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {isClassTab && (
        displayedClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-muted-foreground">Aucune donnée trouvée</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Essayez d&apos;ajuster vos critères de recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedClasses.map(cls => (
              <ClassCard key={cls.classId} cls={cls} />
            ))}
          </div>
        )
      )}

      {activeTab === 'student' && (
        displayedStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-muted-foreground">Aucune donnée trouvée</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Essayez d&apos;ajuster vos critères de recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedStudents.map(s => (
              <StudentCard key={s.studentId} student={s} />
            ))}
          </div>
        )
      )}

      {/* Email dialog */}
      {showEmail && (
        <EmailReportDialog
          classes={classes}
          schoolName={schoolName}
          trimester={trimester}
          academicYear={academicYear}
          onClose={() => setShowEmail(false)}
        />
      )}
    </div>
  )
}
