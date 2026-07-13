'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSubjectColor } from '@/modules/classes/classes.types'
import type { CatalogClassWithNext } from '@/modules/classes/classes.types'

interface Props {
  catalogClass: CatalogClassWithNext | null
  onClose: () => void
}

function renderCurriculum(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-[#c2440f] mt-5 mb-1.5 first:mt-0">
          {line.slice(3)}
        </h3>
      )
      i++
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 mb-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm">
              <span className="text-[#c2440f] font-semibold shrink-0 w-4 tabular-nums">{j + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      )
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      const items: string[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('• '))) {
        items.push(lines[i].replace(/^[-•] /, ''))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 mb-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm">
              <span className="text-[#c2440f] shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    } else if (line.trim()) {
      elements.push(
        <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-1">{line}</p>
      )
      i++
    } else {
      i++
    }
  }

  return elements
}

export function CurriculumDialog({ catalogClass, onClose }: Props) {
  if (!catalogClass) return null

  const colors = getSubjectColor(catalogClass.subjectCode)

  return (
    <Dialog open={!!catalogClass} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[82vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className={cn('px-5 py-4 flex items-center gap-3 border-b border-border', colors.bg)}>
          <div className="h-9 w-9 rounded-xl bg-white/60 flex items-center justify-center shrink-0">
            <BookOpen className={cn('h-4.5 w-4.5', colors.text)} />
          </div>
          <div className="min-w-0">
            <span className={cn('text-[10px] font-bold tracking-wide', colors.text)}>
              {catalogClass.code}
            </span>
            <p className="font-bold text-foreground text-sm leading-snug truncate">{catalogClass.name}</p>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {catalogClass.curriculum
            ? renderCurriculum(catalogClass.curriculum)
            : <p className="text-sm text-muted-foreground italic">Aucun programme défini.</p>
          }
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
