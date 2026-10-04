'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'loading' | 'done'

// Filet de sécurité : un clic qui ne mène finalement à aucune navigation
// (redirection vers la même URL…) ne laisse pas la barre bloquée.
const MAX_LOADING_MS = 30_000
const FADE_OUT_MS = 400

/** Vrai si ce clic va déclencher une navigation interne vers une autre URL. */
function isInternalNavigationClick(e: MouseEvent): boolean {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false
  const anchor = (e.target as Element | null)?.closest?.('a')
  if (!anchor?.href || anchor.hasAttribute('download')) return false
  if (anchor.target && anchor.target !== '_self') return false
  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return false
  return url.pathname !== window.location.pathname || url.search !== window.location.search
}

/**
 * Barre de progression fine en haut de l'écran pendant une navigation entre pages.
 * Démarre au clic sur un lien interne, se termine quand l'URL affichée change.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const url = `${pathname}?${searchParams}`

  const [status, setStatus] = useState<Status>('idle')
  const [prevUrl, setPrevUrl] = useState(url)

  // Fin de navigation : ajusté pendant le rendu (§10), pas dans un useEffect
  if (url !== prevUrl) {
    setPrevUrl(url)
    if (status === 'loading') setStatus('done')
  }

  useEffect(() => {
    // Phase de capture : next/link appelle preventDefault() dans son propre onClick
    function onClick(e: MouseEvent) {
      if (isInternalNavigationClick(e)) setStatus('loading')
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  useEffect(() => {
    if (status === 'idle') return
    const timer = setTimeout(
      () => setStatus(status === 'loading' ? 'done' : 'idle'),
      status === 'loading' ? MAX_LOADING_MS : FADE_OUT_MS,
    )
    return () => clearTimeout(timer)
  }, [status])

  if (status === 'idle') return null

  return (
    <div
      role="progressbar"
      aria-label="Chargement de la page"
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
