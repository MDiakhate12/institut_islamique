'use client'

import { useState } from 'react'

export const PAGE_SIZES = [15, 30, 45] as const

/**
 * Pagination d'une liste déjà filtrée et triée.
 * - `resetKey` : change dès qu'un filtre, une recherche ou un tri change → retour à la page 1.
 * - `focusIndex` : position (dans `items`) de l'élément mis en évidence ; tant que l'utilisateur n'a pas
 *   changé de page, on affiche la page qui le contient.
 */
export function usePagination<T>(items: T[], { resetKey, focusIndex = -1 }: { resetKey: string; focusIndex?: number }) {
  const [pageSize, setPageSizeState] = useState<number>(PAGE_SIZES[0])
  const [userPage, setUserPage] = useState<number | null>(null)
  const [prevKey, setPrevKey] = useState(resetKey)

  // Ajustement pendant le rendu (pas d'effet) : un nouveau filtre ramène à la première page
  if (prevKey !== resetKey) {
    setPrevKey(resetKey)
    setUserPage(0)
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const focusPage = focusIndex >= 0 ? Math.floor(focusIndex / pageSize) : 0
  const page = Math.min(userPage ?? focusPage, pageCount - 1)
  const start = page * pageSize

  return {
    pageItems: items.slice(start, start + pageSize),
    start,
    page,
    pageCount,
    pageSize,
    total: items.length,
    setPage: (p: number) => setUserPage(Math.max(0, Math.min(p, pageCount - 1))),
    setPageSize: (n: number) => { setPageSizeState(n); setUserPage(0) },
  }
}

export type PaginationState = Pick<ReturnType<typeof usePagination>, 'page' | 'pageCount' | 'pageSize' | 'total' | 'start' | 'setPage' | 'setPageSize'>
