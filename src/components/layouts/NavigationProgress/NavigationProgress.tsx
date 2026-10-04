'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useIsFetching, useIsMutating, type Query } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { endNavigation, startNavigation, usePendingPathname } from './navigation-store'

type Status = 'idle' | 'loading' | 'done'

// Filet de sécurité : une navigation qui n'aboutit jamais ne bloque pas l'écran
const MAX_PENDING_MS = 15_000
const FADE_OUT_MS = 400

/** Requêtes qui ne déclenchent pas la barre (polling de la cloche : `meta: { silent: true }`). */
const isVisibleQuery = (query: Query) => !query.meta?.silent

/** Pathname cible si ce clic va déclencher une navigation interne vers une autre page. */
function navigationTarget(e: MouseEvent): string | null {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null
  const anchor = (e.target as Element | null)?.closest?.('a')
  if (!anchor?.href || anchor.hasAttribute('download')) return null
  if (anchor.target && anchor.target !== '_self') return null
  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return null
  return url.pathname !== window.location.pathname ? url.pathname : null
}

/**
 * Barre dorée de 3 px en haut de l'écran, visible pendant chaque requête serveur :
 * navigation entre pages (dès le clic) et requêtes / enregistrements TanStack Query.
 * Pilote aussi l'état « navigation en cours » (menu actif + loader instantanés, §7.23).
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const pendingPathname = usePendingPathname()
  const fetching = useIsFetching({ predicate: isVisibleQuery })
  const mutating = useIsMutating()
  const active = pendingPathname !== null || fetching > 0 || mutating > 0

  const [status, setStatus] = useState<Status>('idle')
  // Ajusté pendant le rendu, pas dans un useEffect (§10)
  if (active && status !== 'loading') setStatus('loading')
  if (!active && status === 'loading') setStatus('done')

  useEffect(() => {
    // Phase de capture : next/link appelle preventDefault() dans son propre onClick
    function onClick(e: MouseEvent) {
      const target = navigationTarget(e)
      if (target) startNavigation(target)
    }
    document.addEventListener('click', onClick, true)

    // Next met à jour l'historique quand la nouvelle page est affichée — y compris après une
    // redirection serveur vers la page courante, où le pathname ne change pas. Il le fait dans un
    // useInsertionEffect, qui interdit toute mise à jour React : fin différée d'une micro-tâche.
    const { pushState, replaceState } = window.history
    window.history.pushState = function (...args) {
      pushState.apply(this, args)
      queueMicrotask(endNavigation)
    }
    window.history.replaceState = function (...args) {
      replaceState.apply(this, args)
      queueMicrotask(endNavigation)
    }

    return () => {
      document.removeEventListener('click', onClick, true)
      window.history.pushState = pushState
      window.history.replaceState = replaceState
    }
  }, [])

  // Nouvelle page affichée (ou Précédent / Suivant du navigateur)
  useEffect(() => { endNavigation() }, [pathname])

  useEffect(() => {
    if (pendingPathname === null) return
    const timer = setTimeout(endNavigation, MAX_PENDING_MS)
    return () => clearTimeout(timer)
  }, [pendingPathname])

  useEffect(() => {
    if (status !== 'done') return
    const timer = setTimeout(() => setStatus('idle'), FADE_OUT_MS)
    return () => clearTimeout(timer)
  }, [status])

  if (status === 'idle') return null

  return (
    <div
      role="progressbar"
      aria-label="Chargement"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className={cn(
          'h-full origin-left bg-amber-400 shadow-[0_0_8px_var(--color-amber-400)]',
          status === 'loading' ? 'animate-progress-trickle' : 'opacity-0 transition-opacity duration-300 delay-100',
        )}
      />
    </div>
  )
}
