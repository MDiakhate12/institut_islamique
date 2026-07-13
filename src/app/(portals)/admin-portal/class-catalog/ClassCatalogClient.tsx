'use client'

import { useState, useMemo } from 'react'
import { useCatalogClasses } from '@/modules/classes/classes.hooks'
import { getSubjectColor, SUBJECT_LABELS } from '@/modules/classes/classes.types'
import type { CatalogClassWithNext } from '@/modules/classes/classes.types'
import { ClassCatalogFormDialog } from './ClassCatalogForm'
import { CurriculumDialog } from './CurriculumDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Pencil, ArrowRight, LayoutGrid, GitFork, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type ViewMode = 'cards' | 'graph'

export function ClassCatalogClient({ readonly = false }: { readonly?: boolean } = {}) {
  const { data: classes, isLoading } = useCatalogClasses()
  const [view,   setView]   = useState<ViewMode>('cards')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!classes) return []
    if (!search) return classes
    const q = search.toLowerCase()
    return classes.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.subjectCode.toLowerCase().includes(q)
    )
  }, [classes, search])

  // Grouper par matière
  const groups = useMemo(() => {
    const map = new Map<string, CatalogClassWithNext[]>()
    for (const c of filtered) {
      const list = map.get(c.subjectCode) ?? []
      list.push(c)
      map.set(c.subjectCode, list)
    }
    return map
  }, [filtered])

  return (
    <div className="p-6 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">
          Catalogue des classes{' '}
          {classes && (
            <span className="text-sm font-normal text-muted-foreground">
              ({classes.length} classe{classes.length !== 1 ? 's' : ''})
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          {/* Toggle Cartes / Graphique */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setView('cards')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                view === 'cards'
                  ? 'bg-[#c2440f] text-white'
                  : 'bg-white text-muted-foreground hover:bg-muted'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cartes
            </button>
            <button
              type="button"
              onClick={() => setView('graph')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-border',
                view === 'graph'
                  ? 'bg-[#c2440f] text-white'
                  : 'bg-white text-muted-foreground hover:bg-muted'
              )}
            >
              <GitFork className="h-3.5 w-3.5 rotate-90" />
              Graphique
            </button>
          </div>
          {!readonly && <ClassCatalogFormDialog allClasses={classes ?? []} />}
        </div>
      </div>

      {/* ── Info banner — admin only ── */}
      {!readonly && (
        <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <span className="font-medium">Définition du catalogue des classes — </span>
            Vous définissez ici les classes qui peuvent être utilisées pour créer des offres de classes plus tard.
            C&apos;est la définition des classes. Utilisez-le pour créer de nouveaux types de classes ou concevoir
            entièrement de nouveaux programmes.
          </div>
        </div>
      )}

      {/* ── Search + subject filter chips ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des classes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {/* Chips matière */}
        <div className="flex gap-1.5">
          {Array.from(new Set(classes?.map(c => c.subjectCode) ?? [])).map(code => {
            const colors = getSubjectColor(code)
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSearch(search === code ? '' : code)}
                className={cn(
                  'px-2.5 py-0.5 rounded text-xs font-bold border transition-colors',
                  colors.bg, colors.text, colors.border,
                  search === code ? 'ring-2 ring-offset-1 ring-foreground/20' : 'opacity-80 hover:opacity-100'
                )}
              >
                {code}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <CatalogSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-medium">Aucune classe trouvée</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'Essayez un autre terme.' : 'Ajoutez votre première classe au catalogue.'}
          </p>
        </div>
      ) : view === 'cards' ? (
        <CardsView groups={groups} allClasses={classes ?? []} readonly={readonly} />
      ) : (
        <GraphView groups={groups} allClasses={classes ?? []} readonly={readonly} />
      )}
    </div>
  )
}

// ── Cards view ───────────────────────────────────────────────────────────────
function CardsView({
  groups,
  allClasses,
  readonly,
}: {
  groups: Map<string, CatalogClassWithNext[]>
  allClasses: CatalogClassWithNext[]
  readonly: boolean
}) {
  return (
    <div className="space-y-8">
      {Array.from(groups.entries()).map(([subjectCode, items]) => {
        const colors = getSubjectColor(subjectCode)
        const label  = SUBJECT_LABELS[subjectCode] ?? subjectCode
        return (
          <section key={subjectCode}>
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-bold px-2 py-0.5 rounded', colors.bg, colors.text)}>
                  {subjectCode}
                </span>
                <span className="font-semibold text-foreground">{label}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {items.length} classe{items.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(c => (
                <CatalogCard key={c.id} catalogClass={c} allClasses={allClasses} readonly={readonly} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ── Single card ──────────────────────────────────────────────────────────────
function CatalogCard({
  catalogClass: c,
  allClasses,
  readonly,
}: {
  catalogClass: CatalogClassWithNext
  allClasses: CatalogClassWithNext[]
  readonly: boolean
}) {
  const colors = getSubjectColor(c.subjectCode)
  const [showCurriculum, setShowCurriculum] = useState(false)

  return (
    <>
      <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-2.5 hover:shadow-sm transition-shadow group">
        {/* Top row: badge + number + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded', colors.bg, colors.text)}>
              {c.subjectCode}
            </span>
            {c.levelNumber && (
              <span className="text-xs font-mono text-muted-foreground">{c.levelNumber}</span>
            )}
          </div>
          {!readonly && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ClassCatalogFormDialog
                catalogClass={c}
                allClasses={allClasses}
                trigger={
                  <button
                    type="button"
                    title="Modifier les infos de la classe"
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                }
              />
            </div>
          )}
        </div>

        {/* Name */}
        <p className="font-semibold text-sm leading-snug">{c.name}</p>

        {/* Next class */}
        {c.nextClassName && (
          <p className="text-xs text-muted-foreground">
            Classe suivante : <span className="font-medium">{c.nextClassCode}</span>
          </p>
        )}

        {/* Voir le programme */}
        {c.curriculum && (
          <button
            type="button"
            onClick={() => setShowCurriculum(true)}
            className="flex items-center gap-1 text-xs text-[#c2440f] hover:underline self-start mt-auto"
          >
            <ArrowRight className="h-3 w-3" />
            Voir le programme
          </button>
        )}
      </div>

      <CurriculumDialog
        catalogClass={showCurriculum ? c : null}
        onClose={() => setShowCurriculum(false)}
      />
    </>
  )
}

// ── Graph view ───────────────────────────────────────────────────────────────
function GraphView({
  groups,
  allClasses,
  readonly,
}: {
  groups: Map<string, CatalogClassWithNext[]>
  allClasses: CatalogClassWithNext[]
  readonly: boolean
}) {
  return (
    <div className="space-y-8 overflow-x-auto">
      {Array.from(groups.entries()).map(([subjectCode, items]) => {
        const colors = getSubjectColor(subjectCode)
        const label  = SUBJECT_LABELS[subjectCode] ?? subjectCode

        // Sort by level number
        const sorted = [...items].sort((a, b) =>
          (parseInt(a.levelNumber ?? '0') || 0) - (parseInt(b.levelNumber ?? '0') || 0)
        )

        return (
          <section key={subjectCode}>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded', colors.bg, colors.text)}>
                {subjectCode}
              </span>
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </div>

            {/* Horizontal flow */}
            <div className="flex items-center gap-0 flex-wrap">
              {sorted.map((c, i) => (
                <div key={c.id} className="flex items-center">
                  {/* Node */}
                  {readonly ? (
                    <div className={cn(
                      'rounded-lg border-2 px-3 py-2 min-w-32 max-w-44',
                      colors.border, colors.bg,
                    )}>
                      <div className={cn('text-[10px] font-bold mb-1', colors.text)}>
                        {c.code}
                      </div>
                      <div className="text-xs font-medium text-foreground leading-tight line-clamp-2">
                        {c.name}
                      </div>
                    </div>
                  ) : (
                    <ClassCatalogFormDialog
                      catalogClass={c}
                      allClasses={allClasses}
                      trigger={
                        <div className={cn(
                          'cursor-pointer rounded-lg border-2 px-3 py-2 min-w-32 max-w-44 hover:shadow-md transition-shadow',
                          colors.border, colors.bg,
                        )}>
                          <div className={cn('text-[10px] font-bold mb-1', colors.text)}>
                            {c.code}
                          </div>
                          <div className="text-xs font-medium text-foreground leading-tight line-clamp-2">
                            {c.name}
                          </div>
                        </div>
                      }
                    />
                  )}
                  {/* Arrow to next (if this class points to next in sequence) */}
                  {i < sorted.length - 1 && c.nextClassId && (
                    <div className="flex items-center px-1 text-muted-foreground/60">
                      <div className="w-4 h-px bg-border" />
                      <ArrowRight className="h-3 w-3 shrink-0" />
                    </div>
                  )}
                  {i < sorted.length - 1 && !c.nextClassId && (
                    <div className="w-3" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function CatalogSkeleton() {
  return (
    <div className="space-y-8">
      {[14, 12, 9].map((count, g) => (
        <div key={g} className="space-y-3">
          <div className="h-5 bg-muted rounded w-32 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-4 space-y-2.5 animate-pulse">
                <div className="flex gap-2">
                  <div className="h-4 w-10 bg-muted rounded" />
                  <div className="h-4 w-8 bg-muted rounded" />
                </div>
                <div className="h-4 bg-muted rounded w-5/6" />
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
