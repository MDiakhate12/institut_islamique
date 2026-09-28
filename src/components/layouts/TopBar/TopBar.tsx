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
  admin:   'bg-amber-50 text-amber-700 border-amber-200',
  teacher: 'bg-blue-50 text-blue-700 border-blue-200',
  parent:  'bg-emerald-50 text-emerald-700 border-emerald-200',
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
      <div className="relative bg-white border-b border-[#cde6c8] shadow-sm transform-gpu will-change-auto">

        {/* ── Contenu principal ── */}
        <div className="px-4 sm:px-6 py-1.5 sm:py-2.5 relative z-10">
          <div className="flex items-center justify-between">

            {/* Gauche : logo + titre */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[#e8f3e5] flex items-center justify-center border border-[#cde6c8] overflow-hidden shrink-0">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-[#2d6a4f]" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-lg font-bold text-[#1a2c1e]">
                  Application Scolaire Qaf
                </h1>
                <p className="text-sm text-[#4d6b54] font-medium flex items-center gap-1">
                  <span className="text-[#cde6c8]">•</span>
                  Portail d&apos;apprentissage islamique
                </p>
              </div>
            </div>

            {/* Droite : statut + école + utilisateur */}
            <div className="hidden lg:flex items-center space-x-2">

              {/* Badge "Connecté" avec pulse */}
              <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg border bg-emerald-50 border-emerald-200">
                <div className="relative h-1.5 w-1.5 shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
                </div>
                <span className="text-sm font-medium text-emerald-700">Connecté</span>
              </div>

              {/* Badge école */}
              {schoolName && (
                <div className="flex items-center space-x-1.5 bg-[#e8f3e5] px-2 py-1 rounded-lg border border-[#cde6c8]">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#2d6a4f] shrink-0" />
                  <span className="text-sm font-medium text-[#1a2c1e] truncate max-w-[160px]">
                    {schoolName}
                  </span>
                </div>
              )}

              {/* Bouton utilisateur + menu déroulant */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center space-x-2 bg-[#f4f9f3] px-3 py-1 rounded-lg border border-[#cde6c8] hover:bg-[#e8f3e5] transition-colors group focus:outline-none cursor-pointer"
                >
                  <div className="text-right">
                    <p className="text-base font-semibold text-[#1a2c1e] leading-tight">
                      {displayName}
                    </p>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {session.roles.map(role => (
                        <span
                          key={role}
                          className={`text-xs px-1.5 py-0.5 rounded-full border ${ROLE_BADGE_CLASSES[role] ?? 'bg-[#e8f3e5] text-[#2d6a4f] border-[#cde6c8]'}`}
                        >
                          {ROLE_LABELS[role] ?? role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="h-6 w-6 rounded-lg bg-[#2d6a4f] flex items-center justify-center shrink-0">
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

      </div>
    </div>
  )
}
