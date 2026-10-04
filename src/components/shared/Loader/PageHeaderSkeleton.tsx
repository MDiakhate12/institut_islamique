import { Shimmer } from './Shimmer'

/** Titre + sous-titre + boutons d'action — en-tête des squelettes des pages à tableau (§7.23). */
export function PageHeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <Shimmer className="h-7 w-56" />
        <Shimmer className="h-4 w-80 max-w-full" />
      </div>
      {actions > 0 && (
        <div className="flex gap-2">
          {Array.from({ length: actions }).map((_, i) => (
            <Shimmer key={i} className="h-9 w-32" />
          ))}
        </div>
      )}
    </div>
  )
}
