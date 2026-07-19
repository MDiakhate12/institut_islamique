'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, User, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOutAction } from '@/app/auth/actions'
import type { Session } from '@/lib/auth/session'
import { ROUTES } from '@/lib/constants'

const ROLE_LABELS: Record<string, string> = {
  admin:   'School Admin',
  teacher: 'Enseignant',
  parent:  'Parent',
}

const ROLE_BADGE_CLASSES: Record<string, string> = {
  admin:   'bg-amber-500/20 text-amber-300 border-amber-400/30',
  teacher: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  parent:  'bg-green-500/20 text-green-300 border-green-400/30',
}

interface TopBarProps {
  session: Session
  schoolName?: string
  userFullName?: string | null
}

export function TopBar({ session, schoolName, userFullName }: TopBarProps) {
  const pathname = usePathname()
  const displayName = userFullName || session.email.split('@')[0]

  // La homepage a son propre en-tête intégré — pas de TopBar
  if (pathname === '/admin-portal') return null

  return (
    <div className="hidden lg:block sticky top-0 z-40 w-full will-change-auto shrink-0">
      <div className="relative bg-gradient-to-r from-[#D17A47] via-[#C89A68] to-[#8B4429] shadow-2xl transform-gpu will-change-auto">

        {/* ── Décoration SVG (diamants en filigrane) ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="topbar-diamonds" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect x="20" y="5" width="14" height="14" transform="rotate(45 20 12)" fill="none" stroke="white" strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#topbar-diamonds)" />
          </svg>
        </div>

        {/* ── Contenu principal ── */}
        <div className="px-4 sm:px-6 py-1.5 sm:py-2.5 relative z-10">
          <div className="flex items-center justify-between">

            {/* Gauche : logo + titre */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-white/25 to-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/30 overflow-hidden shrink-0">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-lg font-bold text-white drop-shadow-lg">
                  Application Scolaire Qaf
                </h1>
                <p className="text-sm text-white/90 font-medium drop-shadow flex items-center gap-1">
                  <span className="text-white/60">•</span>
                  Portail d&apos;apprentissage islamique
                </p>
              </div>
            </div>

            {/* Droite : statut + école + utilisateur */}
            <div className="hidden lg:flex items-center space-x-2">

              {/* Badge "Connecté" avec pulse */}
              <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg border shadow-lg backdrop-blur-xl bg-emerald-500/30 border-emerald-300/40">
                <div className="relative h-1.5 w-1.5 shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-lg shadow-emerald-400/50" />
                  <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping opacity-75" />
                </div>
                <span className="text-sm font-medium text-white drop-shadow">Connecté</span>
              </div>

              {/* Badge école */}
              {schoolName && (
                <div className="flex items-center space-x-1.5 bg-purple-500/30 px-2 py-1 rounded-lg border border-purple-300/40 shadow-lg backdrop-blur-xl">
                  <div
                    className="h-1.5 w-1.5 rounded-full bg-purple-300 shrink-0"
                    style={{ boxShadow: '0 0 4px rgba(216,180,254,0.7)' }}
                  />
                  <span className="text-sm font-medium text-white drop-shadow truncate max-w-[160px]">
                    {schoolName}
                  </span>
                </div>
              )}

              {/* Bouton utilisateur + menu déroulant */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-lg border border-white/30 shadow-xl backdrop-blur-xl hover:bg-white/30 hover:scale-105 transition-all duration-300 group focus:outline-none cursor-pointer"
                >
                  <div className="text-right">
                    <p className="text-base font-semibold text-white drop-shadow leading-tight">
                      {displayName}
                    </p>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {session.roles.map(role => (
                        <span
                          key={role}
                          className={`text-xs px-1.5 py-0.5 rounded-full border ${ROLE_BADGE_CLASSES[role] ?? 'bg-white/20 text-white border-white/30'}`}
                        >
                          {ROLE_LABELS[role] ?? role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#D17A47]/80 to-[#8B4429]/80 flex items-center justify-center shadow-lg border border-white/30 group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate">
                      {session.email}
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <Link href={ROUTES.admin.profile} className="flex-1">
                      Mon profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" className="cursor-pointer p-0">
                    <form action={signOutAction} className="flex items-center w-full px-1.5 py-1">
                      <LogOut className="mr-2 h-4 w-4" />
                      <button type="submit" className="flex-1 text-left text-sm">
                        Se déconnecter
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>
        </div>

        {/* ── Ligne décorative en bas ── */}
        <div className="h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>
    </div>
  )
}
