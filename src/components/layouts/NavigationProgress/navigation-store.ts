'use client'

import { useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Navigation en cours : la page demandée au clic, avant que le serveur ait répondu.
 * Permet d'activer le menu et d'afficher le loader dès le clic, sans loading.tsx ni
 * Suspense (qui font planter les redirect() serveur — §7.23).
 */
let pendingPathname: string | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** À appeler avant un router.push() programmatique pour avoir le même retour instantané qu'un clic. */
export function startNavigation(pathname: string) {
  if (pendingPathname === pathname) return
  pendingPathname = pathname
  emit()
}

export function endNavigation() {
  if (pendingPathname === null) return
  pendingPathname = null
  emit()
}

/** Pathname de la page demandée, ou null si aucune navigation n'est en cours. */
export function usePendingPathname(): string | null {
  return useSyncExternalStore(subscribe, () => pendingPathname, () => null)
}

/** Page à mettre en avant dans les menus : celle demandée si une navigation est en cours. */
export function useDisplayedPathname(): string {
  const pathname = usePathname()
  return usePendingPathname() ?? pathname
}
