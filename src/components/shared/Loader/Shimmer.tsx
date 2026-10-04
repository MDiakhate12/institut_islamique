import { cn } from '@/lib/utils'

/**
 * Bloc de squelette avec reflet (utilitaire `shimmer`, globals.css).
 * Réservé aux squelettes des tableaux de données (Élèves, Inscriptions, Budget — §7.23) ;
 * ailleurs, utiliser `Loader`.
 */
export function Shimmer({ className, ...props }: React.ComponentProps<'div'>) {
  return <div aria-hidden className={cn('shimmer rounded-md bg-muted', className)} {...props} />
}
