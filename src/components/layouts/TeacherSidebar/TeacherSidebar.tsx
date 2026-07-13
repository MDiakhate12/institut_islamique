'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  BookMarked, CalendarCheck, Megaphone, Music2,
  ArrowLeftRight, CalendarDays, Library, FileText,
  CreditCard, Clock, Settings, Home,
  ChevronLeft, ChevronRight, User, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Session } from '@/lib/auth/session'
import { UserProfileDialog } from '../Sidebar/UserProfileDialog'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  wip?: boolean
}

const TEACHER_NAV: NavItem[] = [
  { label: 'Mes classes',                   href: '/teacher-portal/classes',       icon: Library },
  { label: 'Devoirs',                       href: '/teacher-portal/homework',      icon: BookMarked },
  { label: 'Présences',                     href: '/teacher-portal/attendance',    icon: CalendarCheck },
  { label: 'Annonces',                      href: '/teacher-portal/announcements', icon: Megaphone, wip: true },
  { label: 'Audio Coran',                   href: '/teacher-portal/audio',         icon: Music2 },
  { label: 'Portail remplaçant',            href: '/teacher-portal/substitutions', icon: ArrowLeftRight, wip: true },
  { label: 'Calendrier académique',         href: '/teacher-portal/calendar',      icon: CalendarDays },
  { label: 'Catalogue des classes',         href: '/teacher-portal/catalog',       icon: Library },
  { label: 'Soumettre les notes d\'examen', href: '/teacher-portal/exams',         icon: FileText, wip: true },
  { label: 'Remboursements',                href: '/teacher-portal/refunds',       icon: CreditCard, wip: true },
  { label: 'Emploi du temps',               href: '/teacher-portal/schedule',      icon: Clock, wip: true },
  { label: 'Paramètres du profil',          href: '/teacher-portal/profile',       icon: Settings },
]

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

interface TeacherSidebarProps {
  session: Session
  userFullName?: string | null
  schoolName?: string | null
}

export function TeacherSidebar({ session, userFullName, schoolName }: TeacherSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const displayName = userFullName || session.email.split('@')[0]
  const hasParentRole = session.roles.includes('parent')
  const hasAdminRole = session.roles.includes('admin')

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
        href="/teacher-portal"
        className="p-4 border-b border-white/20 hover:bg-white/5 transition-colors block shrink-0"
      >
        {collapsed ? (
          <div className="flex justify-center">
            <Home className="h-6 w-6 text-white" />
          </div>
        ) : (
          <>
            <p className="font-bold text-white text-[13px] leading-tight">Portail Qaf</p>
            <p className="text-white/70 text-xs mt-0.5 truncate">Bienvenue, {displayName}</p>
          </>
        )}
      </Link>

      {/* Portal switcher (only if multi-role) */}
      {!collapsed && hasParentRole && (
        <div className="px-3 pt-2 pb-1 shrink-0">
          <div className="flex rounded-lg overflow-hidden border border-white/20 text-xs">
            <Link
              href="/parent-portal"
              className="flex-1 text-center py-1.5 text-white/60 hover:bg-white/10 transition-colors"
            >
              Portail parents
            </Link>
            <div className="flex-1 text-center py-1.5 bg-white/20 text-white font-semibold">
              Portail enseignants
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {TEACHER_NAV.map(item => {
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
              {!collapsed && item.wip && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70 shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Admin portal button */}
      {hasAdminRole && !collapsed && (
        <div className="px-3 pb-2 shrink-0">
          <Link
            href="/admin-portal"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-white/30
                       text-white/80 text-xs font-medium hover:bg-white/10 transition-colors"
          >
            <Shield className="h-3.5 w-3.5 shrink-0" />
            Portail d'administration
          </Link>
        </div>
      )}

      {/* User block */}
      <div className="shrink-0 border-t border-white/20">
        {!collapsed ? (
          <UserProfileDialog session={session} userFullName={userFullName} schoolName={schoolName} profileHref="/teacher-portal/profile">
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
          <UserProfileDialog session={session} userFullName={userFullName} schoolName={schoolName} profileHref="/teacher-portal/profile">
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
