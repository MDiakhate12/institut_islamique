'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays, ChevronLeft, ChevronRight, FileText, Bell,
  CheckCircle2, AlertCircle, BookOpen, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getAdminHomeworkOverviewAction } from '@/modules/homework/homework.actions'
import type { AdminHomeworkOverview, AdminClassHomework } from '@/modules/homework/homework.types'
import { ClassDetailDialog } from './ClassDetailDialog'

type Filter = null | 'submitted' | 'missing'

interface Props {
  initialOverview: AdminHomeworkOverview
  initialDate: string
  schoolName: string
  schoolDays: string[]
}

const DAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function isSchoolDay(dateStr: string, schoolDays: string[]): boolean {
  if (schoolDays.length === 0) return true
  const dow = new Date(dateStr + 'T00:00:00').getDay()
  return schoolDays.some(sd => DAY_INDEX[sd] === dow)
}

function prevSchoolDay(dateStr: string, schoolDays: string[]): string {
  let d = addDays(dateStr, -1)
  for (let i = 0; i < 7; i++) {
    if (isSchoolDay(d, schoolDays)) return d
    d = addDays(d, -1)
  }
  return addDays(dateStr, -1)
}

function nextSchoolDay(dateStr: string, schoolDays: string[]): string {
  let d = addDays(dateStr, 1)
  for (let i = 0; i < 7; i++) {
    if (isSchoolDay(d, schoolDays)) return d
    d = addDays(d, 1)
  }
  return addDays(dateStr, 1)
}

function latestSchoolDay(schoolDays: string[]): string {
  const today = new Date().toISOString().split('T')[0]
  if (isSchoolDay(today, schoolDays)) return today
  return prevSchoolDay(today, schoolDays)
}

function fmtLongDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtShortDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtFilename(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long' })
  const day = d.getDate()
  const month = d.toLocaleDateString('fr-FR', { month: 'long' })
  const year = d.getFullYear()
  return `homework-${weekday}-${day}-${month}-${year}`
}

// ── PDF / Résumé ────────────────────────────────────────────────────────────

function buildResumeHtml(overview: AdminHomeworkOverview, dateStr: string, schoolName: string): string {
  const { stats, classes } = overview
  const completion = stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0
  const dateLabel = fmtLongDate(dateStr)

  const classRows = classes.map(c => {
    const content = c.homework?.surahName
      ? `${c.homework.surahName}${c.homework.surahArabic ? ` – ${c.homework.surahArabic}` : ''}`
      : c.homework?.revisionSurahs?.length
      ? `Révision: ${c.homework.revisionSurahs.map(s => s.name).join(', ')}`
      : '—'
    const status = c.status === 'submitted'
      ? '<span style="color:#16a34a;font-weight:600">Soumis</span>'
      : '<span style="color:#dc2626;font-weight:600">Manquant</span>'
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${c.classCode ? `${c.classCode}: ` : ''}${c.className}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${c.teacherName ?? '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${content}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${status}</td>
    </tr>`
  }).join('')

  const missingRows = classes
    .filter(c => c.status === 'missing')
    .map(c => `<tr>
      <td style="padding:6px 12px;color:#dc2626;font-weight:500">${c.classCode ? `${c.classCode}: ` : ''}${c.className}</td>
      <td style="padding:6px 12px">${c.teacherName ?? '—'}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${fmtFilename(dateStr)}</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; margin: 0; padding: 40px; color: #111; }
  .header { background: linear-gradient(135deg,#7a4f30,#5c3820); color: white; padding: 24px 32px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
  .header h1 { margin:0; font-size:22px; font-weight:700; }
  .header .sub { margin:4px 0 0; font-size:13px; opacity:.8; }
  .header .school { font-size:14px; font-weight:600; opacity:.9; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:28px; }
  .kpi { border:1px solid #e5e7eb; border-radius:10px; padding:16px; text-align:center; }
  .kpi .num { font-size:28px; font-weight:700; margin-bottom:4px; }
  .kpi .label { font-size:12px; color:#6b7280; }
  .kpi.green .num { color:#16a34a; } .kpi.green { border-color:#bbf7d0; background:#f0fdf4; }
  .kpi.red .num { color:#dc2626; } .kpi.red { border-color:#fecaca; background:#fef2f2; }
  .kpi.blue .num { color:#2563eb; } .kpi.blue { border-color:#bfdbfe; background:#eff6ff; }
  .kpi.amber .num { color:#d97706; } .kpi.amber { border-color:#fde68a; background:#fffbeb; }
  h2 { font-size:16px; font-weight:600; color:#374151; margin:0 0 12px; }
  table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:28px; }
  thead th { background:#f9fafb; padding:10px 12px; text-align:left; font-weight:600; color:#374151; border-bottom:2px solid #e5e7eb; }
  .missing-section h2 { color:#dc2626; }
  @media print { body { padding: 20px; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <div>
    <h1>Récapitulatif des devoirs</h1>
    <p class="sub">${dateLabel}</p>
  </div>
  <div class="school">${schoolName}</div>
</div>
<div class="kpis">
  <div class="kpi green"><div class="num">${stats.submitted}</div><div class="label">Soumis</div></div>
  <div class="kpi red"><div class="num">${stats.missing}</div><div class="label">Manquant</div></div>
  <div class="kpi blue"><div class="num">${stats.total}</div><div class="label">Total classes</div></div>
  <div class="kpi amber"><div class="num">${completion}%</div><div class="label">Achèvement</div></div>
</div>
<h2>Classes</h2>
<table>
  <thead><tr>
    <th>Classe</th><th>Enseignant</th><th>Contenu</th><th>Statut</th>
  </tr></thead>
  <tbody>${classRows}</tbody>
</table>
${missingRows ? `<div class="missing-section">
  <h2>Manquant</h2>
  <table><tbody>${missingRows}</tbody></table>
</div>` : ''}
</body></html>`
}

// ── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, value, label, color, active, onClick,
}: {
  icon: React.ElementType
  value: string | number
  label: string
  color: 'green' | 'red' | 'blue' | 'gray'
  active?: boolean
  onClick?: () => void
}) {
  const colors = {
    green: { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700',  icon: 'text-green-600' },
    red:   { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',    icon: 'text-red-500'  },
    blue:  { bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-700',   icon: 'text-blue-600' },
    gray:  { bg: 'bg-gray-50',   border: 'border-gray-200',  text: 'text-gray-500',   icon: 'text-gray-400' },
  }
  const c = colors[color]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border p-5 text-left transition-all',
        c.bg, c.border,
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        active && 'ring-2 ring-offset-2',
        active && color === 'green' && 'ring-green-500',
        active && color === 'red'   && 'ring-red-500',
        !onClick && 'cursor-default',
      )}
    >
      <Icon className={cn('h-8 w-8 mb-2', c.icon)} />
      <p className={cn('text-3xl font-bold', c.text)}>{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </button>
  )
}

// ── Class Card ──────────────────────────────────────────────────────────────

function ClassCard({ cls, onClick }: { cls: AdminClassHomework; onClick: () => void }) {
  const submitted = cls.status === 'submitted'
  const hw = cls.homework

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all hover:shadow-md',
        submitted
          ? 'border-green-200 bg-green-50/60 hover:bg-green-50'
          : 'border-red-200 bg-red-50/40 hover:bg-red-50/60',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={cn('font-semibold text-sm leading-tight', submitted ? 'text-green-800' : 'text-gray-800')}>
          {cls.classCode ? `${cls.classCode}: ` : ''}{cls.className}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700">
            {cls.subjectCode || '?'}
          </span>
          {submitted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
              <CheckCircle2 className="h-3 w-3" />
              Submitted
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
              <AlertCircle className="h-3 w-3" />
              Missing
            </span>
          )}
        </div>
      </div>

      {cls.section && (
        <p className="text-xs text-muted-foreground mb-1">Section {cls.section}</p>
      )}

      {submitted && hw ? (
        <>
          {hw.surahName && (
            <p className="text-xs text-muted-foreground">
              Sourate : {hw.surahName}{hw.surahArabic ? ` – ${hw.surahArabic}` : ''}
            </p>
          )}
          {!hw.surahName && hw.revisionSurahs.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Révision : {hw.revisionSurahs.map(s => s.name).join(', ')}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            Assigné le : {fmtShortDate(hw.assignedDate)}
          </p>
          <p className="text-xs text-muted-foreground">
            Par : {hw.createdByName ?? cls.teacherName ?? '—'}
          </p>
        </>
      ) : (
        <div className="flex items-center gap-1.5 mt-1">
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          <p className="text-xs text-red-600 font-medium">Aucun devoir assigné</p>
        </div>
      )}
      {!submitted && (
        <p className="text-xs text-muted-foreground mt-0.5">
          Enseignant : {cls.teacherName ?? '—'}
        </p>
      )}
    </button>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function HomeworkTrackingClient({ initialOverview, initialDate, schoolName, schoolDays }: Props) {
  const [date, setDate]         = useState(initialDate)
  const [filter, setFilter]     = useState<Filter>(null)
  const [selected, setSelected] = useState<AdminClassHomework | null>(null)

  const { data: overview } = useQuery({
    queryKey: ['admin-homework-overview', date],
    queryFn: async () => {
      const r = await getAdminHomeworkOverviewAction(date)
      return r.success ? r.data : initialOverview
    },
    initialData: date === initialDate ? initialOverview : undefined,
    staleTime: 30_000,
  })

  const data = overview ?? initialOverview

  const handleResume = useCallback(() => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(buildResumeHtml(data, date, schoolName))
    win.document.close()
    setTimeout(() => win.print(), 400)
    const filename = fmtFilename(date)
    win.document.title = filename
  }, [data, date, schoolName])

  const { stats, classes } = data
  const completion = stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0
  const hasMissing = stats.missing > 0

  // Filtered + grouped by room
  const filtered = filter === 'submitted'
    ? classes.filter(c => c.status === 'submitted')
    : filter === 'missing'
    ? classes.filter(c => c.status === 'missing')
    : classes

  const byRoom = filtered.reduce<Record<string, AdminClassHomework[]>>((acc, c) => {
    const key = c.room ?? 'Sans salle'
    acc[key] = [...(acc[key] ?? []), c]
    return acc
  }, {})

  const sectionTitle = filter === 'submitted'
    ? `Classes ayant soumis les devoirs (${stats.submitted})`
    : filter === 'missing'
    ? `Classes sans devoirs soumis (${stats.missing})`
    : 'Vue d\'ensemble des classes'

  function toggleFilter(f: Exclude<Filter, null>) {
    setFilter(prev => prev === f ? null : f)
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Suivi des devoirs scolaires</h1>
        <p className="text-muted-foreground text-sm mt-1">Surveiller les soumissions de devoirs dans toutes les classes</p>
      </div>

      {/* Date banner */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-[#fdf6f0] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c2440f]/10">
            <CalendarDays className="h-5 w-5 text-[#c2440f]" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Devoirs consultés pour le</p>
            <p className="font-semibold text-[#c2440f] capitalize">{fmtLongDate(date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResume}
            className="gap-1.5 text-xs h-8"
          >
            <FileText className="h-3.5 w-3.5" />
            Résumé
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={() => { setDate(d => prevSchoolDay(d, schoolDays)); setFilter(null) }}
          >
            <ChevronLeft className="h-4 w-4 mr-0.5" />
            Jour précédent
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs text-[#c2440f]"
            onClick={() => { setDate(latestSchoolDay(schoolDays)); setFilter(null) }}
          >
            Aller à aujourd&apos;hui
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={() => { setDate(d => nextSchoolDay(d, schoolDays)); setFilter(null) }}
          >
            Jour suivant
            <ChevronRight className="h-4 w-4 ml-0.5" />
          </Button>
        </div>
      </div>

      {/* Overview header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">Aperçu des devoirs</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {stats.teachersSubmitted} / {stats.teachersTotal} teachers
          </span>
        </div>
        {hasMissing && (
          <Button
            size="sm"
            className="gap-2 text-xs h-8"
            style={{ backgroundColor: '#7a4f30' }}
          >
            <Bell className="h-3.5 w-3.5" />
            Relancer les enseignants
          </Button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          icon={CheckCircle2}
          value={stats.submitted}
          label="Classes soumises"
          color="green"
          active={filter === 'submitted'}
          onClick={() => toggleFilter('submitted')}
        />
        <KpiCard
          icon={AlertCircle}
          value={stats.missing}
          label="Classes manquantes"
          color={hasMissing ? 'red' : 'gray'}
          active={filter === 'missing'}
          onClick={() => toggleFilter('missing')}
        />
        <KpiCard
          icon={BookOpen}
          value={stats.total}
          label="Total des classes"
          color="blue"
        />
        <KpiCard
          icon={completion === 100 ? CheckCircle2 : AlertCircle}
          value={`${completion}%`}
          label="Complétion"
          color={completion === 100 ? 'green' : completion === 0 ? 'red' : 'red'}
        />
      </div>

      {/* Classes section */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">{sectionTitle}</h2>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/20 py-14 gap-3">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">Aucune classe trouvée</p>
            <p className="text-sm text-muted-foreground/70">
              {filter === 'missing'
                ? 'Toutes les classes ont soumis leurs devoirs !'
                : 'Aucune classe n\'a encore été créée'}
            </p>
          </div>
        ) : (
          Object.entries(byRoom).map(([room, roomClasses]) => (
            <div key={room}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-foreground">Salle : {room}</h3>
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  {roomClasses.length} classe{roomClasses.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {roomClasses.map(cls => (
                  <ClassCard
                    key={cls.classId}
                    cls={cls}
                    onClick={() => setSelected(cls)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail dialog */}
      <ClassDetailDialog
        cls={selected}
        date={date}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
