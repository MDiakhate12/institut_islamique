'use client'

import { useState } from 'react'

/**
 * Vrai tant que le premier chargement d'une page n'est pas terminé, puis toujours faux.
 * Les rechargements suivants (autre classe, autre enfant…) ne remplacent plus toute la page.
 */
export function useInitialLoading(loading: boolean): boolean {
  const [done, setDone] = useState(!loading)
  // Ajusté pendant le rendu, pas dans un useEffect (§10)
  if (!done && !loading) setDone(true)
  return !done
}
