'use client'

import { useState, useMemo } from 'react'
import { ClipboardList, FileText, ImageIcon, Lock, User, Headphones, Plus, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { QuranPlayer } from './QuranPlayer'
import { SubmitHomeworkDialog } from './SubmitHomeworkDialog'
import type { ParentChild, ParentHomeworkItem } from '@/modules/homework/homework.types'
import Link from 'next/link'

// ── Link Child Modal (reused from /children page) ──────────────────────────────
// We use a direct link to the children page which has the OTP modal
function NoChildrenState() {
  return (
    <div className="flex-1 flex items-start justify-center p-6 pt-10">
      <div className="w-full max-w-xl rounded-2xl border border-orange-200 bg-orange-50/60 p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-orange-100 p-3 shrink-0">
            <ClipboardList className="h-6 w-6 text-[#c2440f]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[#c2440f] text-lg">Aucun enfant trouvé</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Vous n&apos;avez aucun enfant enregistré dans le système. Cliquez sur le bouton
              ci-dessous pour lier vos enfants à votre compte en toute sécurité.
            </p>
            <Link href="/parent-portal/children">
              <Button className="mt-4 bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-2">
                <Plus className="h-4 w-4" />
                Ajouter d&apos;autres enfants
              </Button>
            </Link>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-[#c2440f]" />
                Vous devrez vérifier votre numéro de téléphone pour lier des élèves à votre compte.
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-[#c2440f]" />
                Utilisez le numéro de téléphone enregistré dans le compte scolaire de votre enfant.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── File attachment row ────────────────────────────────────────────────────────
function FileRow({ url, name, size }: { url: string; name: string; size: number | null }) {
  const ext = name.split('.').pop()?.toUpperCase() ?? 'FILE'
  const isImg = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(ext)
  const kb = size ? (size / 1024).toFixed(1) : null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold',
        isImg ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
      )}>
        {isImg ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs font-medium">{name}</p>
        {kb && <p className="text-[10px] text-muted-foreground">{kb} KB</p>}
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="shrink-0 text-xs font-medium text-[#c2440f] hover:underline">
        Voir
      </a>
    </div>
  )
}

// ── Single homework card ────────────────────────────────────────────────────────
function HomeworkCard({
  item,
  childName,
  onSubmit,
  onReload,
}: {
  item: ParentHomeworkItem
  childName: string
  onSubmit: (item: ParentHomeworkItem) => void
  onReload: () => void
}) {
  const [showPlayer, setShowPlayer] = useState(false)
  const hasQuran = !!item.surahName

  const versesLabel = hasQuran
    ? item.isFullSurah
      ? 'Sourate complète'
      : `V. ${item.fromVerse} – ${item.toVerse}`
    : null

  const dateLabel = new Date(item.assignedDate).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className={cn(
      'rounded-2xl border bg-white shadow-sm overflow-hidden',
      item.submissionUrl ? 'border-green-200' : 'border-border'
    )}>
      {/* Submitted banner */}
      {item.submissionUrl && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-1.5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-green-700">Devoir soumis</span>
        </div>
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{item.className}</p>
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-[#c2440f]">
              Sec: {item.classSection ?? '1'}
            </span>
            <span className="rounded-md bg-[#7a4f30]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#7a4f30]">
              {item.classCode}
            </span>
          </div>
        </div>

        {/* HIFZ badge */}
        {hasQuran && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#c2440f]/10 px-2 py-0.5 text-[10px] font-bold text-[#c2440f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c2440f]" />
              HIFZ
            </span>
          </div>
        )}

        {/* Surah title + headphone toggle */}
        {hasQuran && (
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-[#7a4f30] leading-tight">
                {item.surahName} - {item.surahArabic}
              </h3>
              {versesLabel && (
                <p className="text-xs text-muted-foreground mt-0.5">{versesLabel}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowPlayer(p => !p)}
              title={showPlayer ? "Masquer l'audio" : 'Écouter'}
              className={cn(
                'mt-1 shrink-0 rounded-full p-1.5 transition-colors',
                showPlayer
                  ? 'bg-[#7a4f30]/10 text-[#7a4f30]'
                  : 'text-muted-foreground hover:text-[#7a4f30] hover:bg-[#7a4f30]/5'
              )}
            >
              <Headphones className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Quran player */}
        {hasQuran && showPlayer && (
          <QuranPlayer
            surahNumber={item.surahName ? getSurahNumber(item.surahName) : 1}
            surahName={item.surahName!}
            surahArabic={item.surahArabic!}
            fromVerse={item.fromVerse ?? 1}
            toVerse={item.toVerse ?? 1}
          />
        )}

        {/* Notes */}
        {item.description && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-[#c2440f]">Notes :</p>
            <p className="text-sm text-[#c2440f] mt-0.5">{item.description}</p>
          </div>
        )}

        {/* Revision surahs */}
        {item.revisionSurahs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.revisionSurahs.map(s => (
              <span key={s.name} className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-[#c2440f]">
                {s.name}
              </span>
            ))}
          </div>
        )}

        {/* File attachment */}
        {item.fileUrl && item.fileName && (
          <div className="mt-3">
            <FileRow url={item.fileUrl} name={item.fileName} size={item.fileSize} />
          </div>
        )}

        {/* Footer: submit button or lock */}
        <div className="mt-4 flex items-center justify-between">
          {item.isLatest ? (
            <Button
              size="sm"
              onClick={() => onSubmit(item)}
              className={cn(
                'gap-2 text-white',
                item.submissionUrl
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-[#c2440f] hover:bg-[#a33a0d]'
              )}
            >
              {item.submissionUrl ? (
                <><span className="text-sm">✓</span> Soumettre à nouveau</>
              ) : (
                <><span className="text-base">🎤</span> Soumettre le devoir</>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span>Seul le dernier devoir peut être soumis</span>
            </div>
          )}
          {item.teacherName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <User className="h-3.5 w-3.5" />
              <span>{item.teacherName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────
import { SURAHS } from '@/modules/homework/surahs.data'

function getSurahNumber(name: string): number {
  return SURAHS.find(s => s.name === name)?.number ?? 1
}

function groupByDate(items: ParentHomeworkItem[]): [string, ParentHomeworkItem[]][] {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const map = new Map<string, ParentHomeworkItem[]>()

  for (const item of items) {
    const key = item.assignedDate as string
    const arr = map.get(key) ?? []
    arr.push(item)
    map.set(key, arr)
  }

  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([key, val]) => {
    let label: string
    if (key === today) label = "Aujourd'hui"
    else if (key === yesterday) label = 'Hier'
    else label = new Date(key).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    return [label, val] as [string, ParentHomeworkItem[]]
  })
}

function groupByClass(items: ParentHomeworkItem[]): [string, { subjectCode: string; items: ParentHomeworkItem[] }][] {
  const map = new Map<string, { subjectCode: string; items: ParentHomeworkItem[] }>()
  for (const item of items) {
    const key = item.classId
    const entry = map.get(key) ?? { subjectCode: item.subjectCode, items: [] }
    entry.items.push(item)
    map.set(key, entry)
  }
  return [...map.entries()].map(([, val]) => [val.items[0].className, val])
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  initialChildren: ParentChild[]
  initialHomework: ParentHomeworkItem[]
}

export function HomeworkClient({ initialChildren, initialHomework }: Props) {
  const [children] = useState(initialChildren)
  const [homework, setHomework] = useState(initialHomework)
  const [selectedChildId, setChild] = useState(children[0]?.studentId ?? '')
  const [view, setView] = useState<'chronologie' | 'classe'>('chronologie')
  const [submitting, setSubmitting] = useState<ParentHomeworkItem | null>(null)

  const filtered = useMemo(
    () => homework.filter(h => h.studentId === selectedChildId),
    [homework, selectedChildId]
  )

  const totalCount = filtered.length
  const selectedChild = children.find(c => c.studentId === selectedChildId)
  const childName = selectedChild ? `${selectedChild.firstName} ${selectedChild.lastName}` : ''

  function handleSubmitted() {
    // Optimistically mark item as submitted
    if (!submitting) return
    setHomework(prev => prev.map(h =>
      h.id === submitting.id && h.studentId === submitting.studentId
        ? { ...h, submissionUrl: 'pending' }
        : h
    ))
  }

  if (children.length === 0) return <NoChildrenState />

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div className="sticky top-0 z-10 bg-[#FFF8F0] border-b border-border/50 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#c2440f]/10 p-2.5">
              <ClipboardList className="h-5 w-5 text-[#c2440f]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Devoirs</h1>
              <p className="text-sm text-muted-foreground">Voir et gérer les devoirs de vos enfants</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Count */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              <span>{totalCount} devoir{totalCount !== 1 ? 's' : ''}</span>
            </div>
            {/* View toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setView('chronologie')}
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  view === 'chronologie' ? 'bg-[#7a4f30] text-white' : 'bg-white text-muted-foreground hover:bg-muted/50'
                )}
              >
                Chronologie
              </button>
              <button
                type="button"
                onClick={() => setView('classe')}
                className={cn(
                  'px-3 py-1.5 transition-colors border-l border-border',
                  view === 'classe' ? 'bg-[#7a4f30] text-white' : 'bg-white text-muted-foreground hover:bg-muted/50'
                )}
              >
                Par classe
              </button>
            </div>
            {/* Add child */}
            <Link href="/parent-portal/children">
              <Button size="sm" className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Ajouter d&apos;autres enfants
              </Button>
            </Link>
          </div>
        </div>

        {/* Child tabs */}
        {children.length > 0 && (
          <div className="mt-3 flex gap-2">
            {children.map(child => (
              <button
                key={child.studentId}
                type="button"
                onClick={() => setChild(child.studentId)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors border',
                  child.studentId === selectedChildId
                    ? 'bg-[#7a4f30] text-white border-[#7a4f30]'
                    : 'bg-white text-muted-foreground border-border hover:border-[#7a4f30]/50'
                )}
              >
                {child.firstName} {child.lastName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-muted-foreground">Aucun devoir pour le moment</p>
            <p className="text-sm text-muted-foreground mt-1">Les devoirs assignés par les enseignants apparaîtront ici.</p>
          </div>
        ) : view === 'chronologie' ? (
          // ── Chronologie view ─────────────────────────────────────────────
          <div className="space-y-8 max-w-2xl">
            {groupByDate(filtered).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-foreground capitalize">{dateLabel}</h2>
                  <span className="text-sm text-muted-foreground">{items.length} devoir{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-4">
                  {items.map(item => (
                    <HomeworkCard
                      key={`${item.id}:${item.studentId}`}
                      item={item}
                      childName={childName}
                      onSubmit={setSubmitting}
                      onReload={() => {}}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // ── Par classe view ──────────────────────────────────────────────
          <div className="space-y-8 max-w-4xl">
            {groupByClass(filtered).map(([className, { subjectCode, items }]) => (
              <div key={className}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-foreground">{className}</h2>
                    <span className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                      subjectCode === 'QRN'
                        ? 'bg-[#c2440f]/10 text-[#c2440f]'
                        : subjectCode === 'ARA'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    )}>
                      {subjectCode}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">{items.length} devoir{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {items.map(item => (
                    <HomeworkCard
                      key={`${item.id}:${item.studentId}`}
                      item={item}
                      childName={childName}
                      onSubmit={setSubmitting}
                      onReload={() => {}}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit dialog */}
      {submitting && (
        <SubmitHomeworkDialog
          open={!!submitting}
          onOpenChange={v => { if (!v) setSubmitting(null) }}
          homeworkId={submitting.id}
          studentId={submitting.studentId}
          studentName={childName}
          surahName={submitting.surahName}
          surahArabic={submitting.surahArabic}
          isFullSurah={submitting.isFullSurah}
          fromVerse={submitting.fromVerse}
          toVerse={submitting.toVerse}
          assignedDate={submitting.assignedDate}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  )
}
