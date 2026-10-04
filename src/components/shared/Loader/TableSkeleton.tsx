import { Shimmer } from './Shimmer'

interface TableSkeletonProps {
  columns?: number
  rows?: number
}

/** Tableau (en-tête + lignes) pendant le chargement. À placer dans le conteneur bordé du tableau. */
export function TableSkeleton({ columns = 6, rows = 5 }: TableSkeletonProps) {
  return (
    <div role="status" aria-live="polite" className="overflow-x-auto">
      <span className="sr-only">Chargement…</span>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-3 py-3"><Shimmer className="h-3 w-20" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-border/50">
              {Array.from({ length: columns }).map((_, j) => (
                <td key={j} className="px-3 py-3"><Shimmer className="h-4 w-full" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
