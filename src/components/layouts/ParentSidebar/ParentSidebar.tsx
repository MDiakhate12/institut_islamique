'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Users, BookMarked, CalendarCheck, Megaphone, Music2,
  CalendarOff, Star, CalendarDays, Library, FileText,
  CreditCard, Download, Clock, Settings, Home,
  ChevronLeft, ChevronRight, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Session } from '@/lib/auth/session'
import { UserProfileDialog } from '../Sidebar/UserProfileDialog'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const PARENT_NAV: NavItem[] = [
  { label: 'Mes enfants',             href: '/parent-portal/children',   icon: Users },
  { label: 'Devoirs',                 href: '/parent-portal/homework',   icon: BookMarked },
  { label: 'Présences',               href: '/parent-portal/attendance', icon: CalendarCheck },
  { label: 'Annonces',                href: '/parent-portal/announcements', icon: Megaphone },
  { label: 'Audio Coran',             href: '/parent-portal/audio',      icon: Music2 },
  { label: "Demande d'absence",       href: '/parent-portal/absence',    icon: CalendarOff },
  { label: 'Étoiles & Trophées',      href: '/parent-portal/stars',      icon: Star },
  { label: 'Calendrier académique',   href: '/parent-portal/calendar',   icon: CalendarDays },
  { label: 'Catalogue des classes',   href: '/parent-portal/catalog',    icon: Library },
  { label: 'Voir les notes d\'examen',href: '/parent-portal/exams',      icon: FileText },
  { label: 'Statut de paiement',      href: '/parent-portal/payments',   icon: CreditCard },
  { label: 'S\'inscrire maintenant',  href: '/parent-portal/enrollment', icon: Download },
  { label: 'Emploi du temps',         href: '/parent-portal/schedule',   icon: Clock },
  { label: 'Paramètres du profil',    href: '/parent-portal/profile',    icon: Settings },
]

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

interface ParentSidebarProps {
  session: Session
  userFullName?: string | null
  schoolName?: string | null
}

export function ParentSidebar({ session, userFullName, schoolName }: ParentSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const displayName = userFullName || session.email.split('@')[0]

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div
      className={cn(
        'h-[100dvh] flex flex-col bg-gradient-to-b from-[#DBA571] to-[#8B4429]',
        'border-r border-white/10 shadow-xl relative overscroll-contain shrink-0',
        'transition-all duration-300',
        collapsed ? 'w-16' : 'w-[220px]'
      )}
    >
      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-50
                   w-10 h-10 bg-[#8B4429] border-2 border-white/20 rounded-full
                   items-center justify-center text-white/80
                   hover:text-white hover:bg-[#684C42] shadow-lg
                   transition-all cursor-pointer hover:scale-110"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* Header */}
      <Link
        href="/parent-portal"
        className="p-5 border-b border-white/20 hover:bg-white/5 transition-colors block shrink-0"
      >
        {collapsed ? (
          <div className="flex justify-center">
            <Home className="h-6 w-6 text-white" />
          </div>
        ) : (
          <>
            <p className="font-bold text-white text-[14px] leading-tight">Portail parents</p>
            <p className="text-white/70 text-sm mt-1 truncate">Bienvenue, {displayName}</p>
          </>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {PARENT_NAV.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-2.5 mx-1 px-3 py-2 rounded-lg text-sm transition-colors',
                collapsed ? 'justify-center mx-1 w-[calc(100%-8px)]' : '',
                active
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <span className="truncate flex-1">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User block */}
      <div className="shrink-0 border-t border-white/20">
        {!collapsed ? (
          <UserProfileDialog session={session} userFullName={userFullName} schoolName={schoolName}>
            <div className="flex items-center gap-2.5 px-4 py-3 hover:bg-white/10 transition-colors cursor-pointer w-full">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center
                              text-white text-xs font-bold shrink-0 border border-white/30">
                {getInitials(displayName) || <User className="h-4 w-4 text-white/80" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold truncate leading-tight">{displayName}</p>
                <p className="text-white/60 text-xs truncate">{session.email}</p>
              </div>
            </div>
          </UserProfileDialog>
        ) : (
          <UserProfileDialog session={session} userFullName={userFullName} schoolName={schoolName}>
            <div className="flex justify-center py-3 hover:bg-white/10 transition-colors cursor-pointer">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center
                              text-white text-xs font-bold border border-white/30">
                {getInitials(displayName) || <User className="h-4 w-4 text-white/80" />}
              </div>
            </div>
          </UserProfileDialog>
        )}
      </div>
    </div>
  )
}
