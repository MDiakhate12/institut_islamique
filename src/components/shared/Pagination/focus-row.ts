/**
 * À l'arrivée par un lien (`?student=` / `?guardian=`) : fait apparaître la ligne mise en évidence (`data-focus-row`)
 * dans le tiers supérieur de la zone de défilement — comme une ancre de page — seulement si elle n'est pas déjà
 * visible. Un clic sur une ligne ne défile jamais (elle est déjà sous le curseur).
 * Refait la vérification un instant plus tard : après une navigation côté client, le routeur Next peut remettre
 * le défilement en haut. Renvoie la fonction de nettoyage.
 */
export function revealFocusRow(): () => void {
  const reveal = () => {
    const row = document.querySelector('[data-focus-row]')
    if (!row) return
    let scroller: HTMLElement | null = row.parentElement
    while (scroller && !(scroller.scrollHeight > scroller.clientHeight && /(auto|scroll)/.test(getComputedStyle(scroller).overflowY))) {
      scroller = scroller.parentElement
    }
    if (!scroller) return
    const box = scroller.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    if (r.top >= box.top + 8 && r.bottom <= box.bottom - 8) return // déjà visible
    scroller.scrollTo({ top: scroller.scrollTop + (r.top - box.top) - box.height * 0.25 })
  }
  reveal()
  const timer = window.setTimeout(reveal, 150)
  return () => window.clearTimeout(timer)
}

/**
 * Style d'une ligne de tableau sélectionnée : fond vert doux, liseré vert épais à gauche, filets fins en haut et en bas.
 * Appliqué aux cellules (`td`) : un `box-shadow` / `ring` sur un `tr` est mal rendu dans un tableau `border-collapse`,
 * et les cellules figées (sticky) ont leur propre fond.
 */
export const FOCUS_ROW_CLASS =
  '[&>td]:bg-emerald-50! [&>td]:border-y [&>td]:border-emerald-200 [&>td:first-child]:shadow-[inset_4px_0_0_#2d6a4f]'

/** Clignotement du contour, à l'arrivée par un lien seulement (voir `row-flash` dans globals.css). */
export const FOCUS_ROW_FLASH_CLASS = 'animate-row-flash'
