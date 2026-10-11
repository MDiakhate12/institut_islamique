'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PAGE_SIZES, type PaginationState } from './usePagination'

/** Numéros affichés : première, dernière, et 2 de chaque côté de la page courante ('…' entre les trous). */
function visiblePages(page: number, pageCount: number): (number | '…')[] {
  const wanted = new Set([0, pageCount - 1, page - 2, page - 1, page, page + 1, page + 2])
  const sorted = [...wanted].filter(p => p >= 0 && p < pageCount).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

export function Pagination({ state, noun = 'résultat' }: { state: PaginationState; noun?: string }) {
  const { page, pageCount, pageSize, total, start, setPage, setPageSize } = state
  if (total === 0) return null
  const from = start + 1
  const to = Math.min(start + pageSize, total)

  const btn = 'h-8 min-w-8 px-2 inline-flex items-center justify-center rounded-lg border border-border bg-white text-xs font-medium text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:pointer-events-none transition-colors'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border bg-white text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>{from}–{to} sur {total} {noun}{total > 1 ? 's' : ''}</span>
        <label className="flex items-center gap-1.5">
          Par page
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            className="h-8 rounded-lg border border-border bg-white px-1.5 text-xs text-foreground"
          >
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button type="button" className={btn} onClick={() => setPage(page - 1)} disabled={page === 0} aria-label="Page précédente">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {visiblePages(page, pageCount).map((p, i) =>
          p === '…'
            ? <span key={`gap-${i}`} className="px-1">…</span>
            : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(btn, p === page && 'bg-[#2d6a4f] border-[#2d6a4f] text-white hover:bg-[#2d6a4f]')}
              >
                {p + 1}
              </button>
            ),
        )}
        <button type="button" className={btn} onClick={() => setPage(page + 1)} disabled={page >= pageCount - 1} aria-label="Page suivante">
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  )
}
