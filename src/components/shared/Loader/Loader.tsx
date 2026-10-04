import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoaderProps {
  /** Texte sous le loader ; toujours lu par les lecteurs d'écran. */
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: { box: 'h-9 w-9', ring: 'border-2', inset: 'inset-[4px]', icon: 'h-4 w-4' },
  md: { box: 'h-14 w-14', ring: 'border-[3px]', inset: 'inset-[6px]', icon: 'h-6 w-6' },
  lg: { box: 'h-20 w-20', ring: 'border-4', inset: 'inset-[8px]', icon: 'h-8 w-8' },
}

/**
 * Loader standard de l'appli : logo (celui de la barre du haut) dans un cercle qui tourne.
 * Les squelettes sont réservés aux tableaux de données (§7.23).
 */
export function Loader({ label = 'Chargement…', size = 'md', className }: LoaderProps) {
  const s = SIZES[size]
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3 py-10', className)}
    >
      <div className={cn('relative shrink-0', s.box)}>
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 rounded-full border-[#2d6a4f]/15 border-t-[#2d6a4f] animate-spin motion-reduce:animate-none',
            s.ring,
          )}
        />
        <div className={cn('absolute rounded-full bg-[#e8f3e5] border border-[#cde6c8] flex items-center justify-center', s.inset)}>
          <GraduationCap aria-hidden className={cn('text-[#2d6a4f]', s.icon)} />
        </div>
      </div>
      <span className={cn('text-sm text-muted-foreground', size === 'sm' && 'sr-only')}>{label}</span>
    </div>
  )
}
