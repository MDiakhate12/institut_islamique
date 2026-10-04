import { cn } from '@/lib/utils'

interface PendingContentProps {
  /** Vrai pendant le chargement des nouvelles données (ex. `isPlaceholderData`). */
  pending: boolean
  children: React.ReactNode
  /** Classes du conteneur du contenu (ex. `space-y-6`). */
  className?: string
}

/**
 * Garde le contenu précédent affiché, atténué, pendant qu'on charge une autre
 * période (jour, trimestre…), avec un filet de progression au-dessus.
 * Pour une autre entité (autre classe, autre enfant), utiliser `Loader`.
 */
export function PendingContent({ pending, children, className }: PendingContentProps) {
  return (
    <div aria-busy={pending} className="relative">
      {pending && (
        <div className="absolute inset-x-0 -top-3 h-0.5 overflow-hidden rounded-full" role="progressbar" aria-label="Mise à jour">
          <div className="h-full origin-left bg-[#2d6a4f] animate-progress-trickle" />
        </div>
      )}
      {/* delay-150 : pas de clignotement si la réponse est quasi immédiate */}
      <div className={cn('transition-opacity duration-200', pending && 'opacity-50 pointer-events-none select-none delay-150', className)}>
        {children}
      </div>
    </div>
  )
}
