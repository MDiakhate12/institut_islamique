'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavShellProps {
  sidebar: React.ReactNode
  title: string
  subtitle?: string | null
  children: React.ReactNode
}

/**
 * Coquille responsive partagée par les 3 portails.
 * - ≥ lg : sidebar en colonne fixe (comportement desktop inchangé)
 * - < lg : sidebar en tiroir off-canvas, ouvert via le bouton hamburger de la barre mobile
 */
export function MobileNavShell({ sidebar, title, subtitle, children }: MobileNavShellProps) {
  const pathname = usePathname()
  // Le tiroir est lié à la page où il a été ouvert → se ferme automatiquement à la navigation
  const [openedOn, setOpenedOn] = useState<string | null>(null)
  const open = openedOn === pathname

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenedOn(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="flex h-[100dvh]">
      {/* Fond assombri (mobile uniquement) */}
      <div
        aria-hidden
        onClick={() => setOpenedOn(null)}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Sidebar : tiroir sur mobile, colonne statique sur desktop */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300',
          'lg:static lg:z-auto lg:translate-none lg:transition-none',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {open && (
          <button
            onClick={() => setOpenedOn(null)}
            className="lg:hidden absolute top-3 -right-11 z-50 h-9 w-9 rounded-full bg-white/90 text-[#1e4535]
                       flex items-center justify-center shadow-md"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {sidebar}
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Barre mobile */}
        <header className="lg:hidden sticky top-0 z-30 shrink-0 flex items-center gap-3 px-3 h-14
                           bg-gradient-to-r from-[#1e4535] to-[#0f2318] text-white shadow-md">
          <button
            onClick={() => setOpenedOn(pathname)}
            className="h-10 w-10 -ml-1 rounded-lg flex items-center justify-center hover:bg-white/10"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate leading-tight">{title}</p>
            {subtitle && <p className="text-xs text-white/70 truncate">{subtitle}</p>}
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}
