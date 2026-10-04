'use client'

import { usePendingPathname } from '@/components/layouts/NavigationProgress/navigation-store'
import { PageLoader } from '@/components/shared/Loader/PageLoader'

/**
 * Zone de contenu défilante des 3 portails. Dès le clic sur un lien, l'ancienne page est
 * masquée (pas démontée : elle réapparaît si la navigation échoue) et remplacée par le loader,
 * sans attendre la réponse du serveur (§7.23).
 */
export function PortalContent({ children }: { children: React.ReactNode }) {
  const pending = usePendingPathname() !== null

  return (
    <div className="flex-1 bg-[#f4f9f3] min-h-0 overflow-y-auto overscroll-contain">
      {pending && <PageLoader />}
      <div className={pending ? 'hidden' : 'contents'}>{children}</div>
    </div>
  )
}
