'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BookOpen, AlertCircle, CheckCircle2, FileText, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminClassHomework } from '@/modules/homework/homework.types'

interface Props {
  cls: AdminClassHomework | null
  date: string
  onClose: () => void
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ClassDetailDialog({ cls, date, onClose }: Props) {
  if (!cls) return null

  const hw = cls.homework
  const isPdf = hw?.fileName?.toLowerCase().endsWith('.pdf')

  const weekdayDate = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <Dialog open={!!cls} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-[#c2440f]" />
            {cls.classCode ? `${cls.classCode}: ${cls.className}` : cls.className}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Détails des devoirs pour le {weekdayDate}
          </p>
        </DialogHeader>

        {/* Class info grid */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Type de classe</span>
            <div className="mt-0.5">
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold bg-orange-100 text-orange-700">
                {cls.subjectCode || '—'}
              </span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Section</span>
            <p className="mt-0.5 font-medium">{cls.section ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Salle</span>
            <p className="mt-0.5 font-medium">{cls.room ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Enseignant</span>
            <p className="mt-0.5 font-medium">{cls.teacherName ?? '—'}</p>
          </div>
        </div>

        {/* Homework status */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Statut des devoirs</span>
            {hw ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                Submitted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
                <AlertCircle className="h-3 w-3" />
                Missing
              </span>
            )}
          </div>

          {hw ? (
            <div className="rounded-xl border border-green-200 bg-green-50/60 p-4 space-y-3">
              {/* Surah */}
              {hw.surahName && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sourate :</p>
                  <p className="text-lg font-bold text-[#c2440f]">
                    {hw.surahName}{hw.surahArabic ? ` – ${hw.surahArabic}` : ''}
                  </p>
                  {hw.isFullSurah && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-white text-sm font-medium w-fit">
                      <CheckCircle2 className="h-4 w-4" />
                      Sourate complète
                    </div>
                  )}
                  {!hw.isFullSurah && hw.fromVerse && hw.toVerse && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Versets {hw.fromVerse} à {hw.toVerse}
                    </div>
                  )}
                  {/* Hifz badge */}
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Nouveau devoir
                    </span>
                  </div>
                </div>
              )}

              {/* Revision surahs */}
              {hw.revisionSurahs.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Révision :</p>
                  <div className="flex flex-wrap gap-1">
                    {hw.revisionSurahs.map(s => (
                      <span key={s.name} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {hw.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes supplémentaires :</p>
                  <p className="text-sm text-[#c2440f] mt-0.5 font-medium">{hw.description}</p>
                </div>
              )}

              {/* Meta */}
              <div className="grid grid-cols-2 gap-2 text-sm pt-1 border-t border-green-200">
                <div>
                  <p className="text-xs text-muted-foreground">Assigné le</p>
                  <p className="text-[#c2440f] font-medium">{fmtDate(hw.assignedDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assigné par</p>
                  <p className="text-[#c2440f] font-medium">{hw.createdByName ?? cls.teacherName ?? '—'}</p>
                </div>
              </div>

              {/* File */}
              {hw.fileName && hw.fileUrl && (
                <div className="pt-1 border-t border-green-200">
                  <p className="text-xs text-muted-foreground mb-1.5">Pièce jointe :</p>
                  <a
                    href={hw.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      isPdf
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    )}
                  >
                    {isPdf ? (
                      <FileText className="h-3.5 w-3.5" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5" />
                    )}
                    <span className="uppercase font-bold mr-1">{isPdf ? 'PDF' : 'IMG'}</span>
                    {hw.fileName}
                    {hw.fileSize && <span className="opacity-60 ml-1">({fmtFileSize(hw.fileSize)})</span>}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Aucun devoir assigné pour cette journée</p>
                  <p className="text-sm text-red-600 mt-0.5">
                    L&apos;enseignant n&apos;a pas encore assigné de devoirs pour le {weekdayDate}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
