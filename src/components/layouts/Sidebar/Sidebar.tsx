'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Users, GraduationCap, BookOpen, ClipboardList, CalendarCheck,
  BookMarked, Star, BookCopy, CalendarDays, BarChart3, Library,
  ArrowLeftRight, UserPlus, FileText,
  CreditCard, Receipt,
  StickyNote, Mail, UserSquare2, Megaphone, Cake,
  Monitor, Trophy, Tv,
  Settings, Shield, RefreshCw, UserCog, Sparkles, Lightbulb,
  Home, Search, ChevronDown, ChevronRight, ChevronLeft, User,
  MessageCircle, DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import type { Session } from '@/lib/auth/session'
import { UserProfileDialog } from './UserProfileDialog'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

interface NavSection {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Académique',
    icon: BookOpen,
    items: [
      { label: 'Étudiants',                  href: ROUTES.admin.students,           icon: Users },
      { label: 'Enseignants',                href: ROUTES.admin.teachers,           icon: GraduationCap },
      { label: 'Classes',                    href: ROUTES.admin.classes,            icon: BookOpen },
      { label: 'Suivi des notes d\'examens', href: ROUTES.admin.trackExams,         icon: ClipboardList },
      { label: 'Suivi des présences',        href: ROUTES.admin.attendance,         icon: CalendarCheck },
      { label: 'Suivi des devoirs',          href: ROUTES.admin.homework,           icon: BookMarked },
      { label: 'Suivi des étoiles',          href: ROUTES.admin.trackStars,         icon: Star },
      { label: 'Catalogue des classes',      href: ROUTES.admin.classCatalog,       icon: BookCopy },
      { label: 'Calendrier académique',      href: ROUTES.admin.calendar,           icon: CalendarDays },
      { label: 'Rapports',                   href: ROUTES.admin.reports,            icon: BarChart3 },
      { label: 'Suivi des livres',           href: ROUTES.admin.bookTracking,       icon: Library },
      { label: 'Remplacements',              href: ROUTES.admin.substitutions,      icon: ArrowLeftRight },
      { label: 'Inscriptions',               href: ROUTES.admin.registrations,      icon: UserPlus },
      { label: 'Formulaires d\'inscription', href: ROUTES.admin.registrationForms,  icon: FileText },
    ],
  },
  {
    label: 'Finance',
    icon: DollarSign,
    items: [
      { label: 'Budget',   href: ROUTES.admin.budget,   icon: CreditCard },
      { label: 'Dépenses', href: ROUTES.admin.expenses, icon: Receipt },
    ],
  },
  {
    label: 'Communication',
    icon: MessageCircle,
    items: [
      { label: 'Notes autocollantes', href: ROUTES.admin.stickyNotes,  icon: StickyNote },
      { label: 'Envoyer un e-mail',   href: ROUTES.admin.sendEmail,    icon: Mail },
      { label: 'Parents',             href: ROUTES.admin.parents,      icon: UserSquare2 },
      { label: 'Annonces',            href: ROUTES.admin.announcements, icon: Megaphone },
      { label: 'Anniversaires',       href: ROUTES.admin.birthdays,    icon: Cake },
    ],
  },
  {
    label: 'TV',
    icon: Monitor,
    items: [
      { label: 'Classement',        href: ROUTES.admin.rankings, icon: Trophy },
      { label: 'Application Qaf TV', href: ROUTES.admin.tv,       icon: Tv, badge: 'New' },
    ],
  },
  {
    label: 'Paramètres',
    icon: Settings,
    items: [
      { label: 'Paramètres de l\'école', href: ROUTES.admin.schoolSettings, icon: Settings },
      { label: 'Autorisations',          href: ROUTES.admin.permissions,    icon: Shield },
      { label: 'Réinitialiser',          href: ROUTES.admin.startNewYear,   icon: RefreshCw },
      { label: 'Paramètres du profil',   href: ROUTES.admin.profile,        icon: UserCog },
      { label: 'Nouveautés',             href: ROUTES.admin.roadmap,        icon: Sparkles },
      { label: 'Demandes de fonctionnalités', href: ROUTES.admin.roadmap,   icon: Lightbulb },
    ],
  },
]

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

interface SidebarProps {
  session: Session
  userFullName?: string | null
  schoolName?: string | null
}

export function Sidebar({ session, userFullName, schoolName }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Académique: true,
    Finance: false,
    Communication: false,
    TV: false,
    Paramètres: false,
  })
  const [search, setSearch] = useState('')

  const displayName = userFullName || session.email.split('@')[0]
  const hasParentRole = session.roles.includes('parent')
  const hasTeacherRole = session.roles.includes('teacher')

  function toggleSection(label: string) {
    setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }))
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Filter items by search
  const filteredSections = search.trim()
    ? NAV_SECTIONS.map(s => ({
        ...s,
        items: s.items.filter(item =>
          item.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(s => s.items.length > 0)
    : NAV_SECTIONS

  return (
    <div
      className={cn(
        // Exact classes from qaf.app
        'h-[100dvh] flex flex-col bg-gradient-to-b from-[#DBA571] to-[#8B4429]',
        'border-r border-white/10 shadow-xl relative overscroll-contain shrink-0',
        'transition-all duration-300',
        collapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      {/* ── Bouton collapse (déborde à droite de la sidebar) ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-50
                   w-10 h-10 bg-[#8B4429] border-2 border-white/20 rounded-full
                   items-center justify-center text-white/80
                   hover:text-white hover:bg-[#684C42] shadow-lg
                   transition-all cursor-pointer hover:scale-110"
        aria-label={collapsed ? 'Ouvrir' : 'Réduire'}
      >
        {collapsed
          ? <ChevronRight className="h-4 w-4" />
          : <ChevronLeft  className="h-4 w-4" />
        }
      </button>

      {/* ── En-tête : lien vers la homepage ── */}
      <Link
        href={ROUTES.admin.root}
        className="p-5 border-b border-white/20 hover:bg-white/5 transition-colors block shrink-0"
      >
        {collapsed ? (
          <div className="flex justify-center">
            <Home className="h-6 w-6 text-white" />
          </div>
        ) : (
          <>
            <p className="font-bold text-white text-[15px] leading-tight">
              Portail d'administration
            </p>
            <p className="text-white/70 text-sm mt-1 truncate">
              Bienvenue, {displayName}
            </p>
          </>
        )}
      </Link>

      {/* ── Recherche ── */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-white/20 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/20 backdrop-blur-xl border border-white/30 rounded-xl
                         pl-8 pr-3 py-2 text-sm text-white placeholder-white/60
                         focus:outline-none focus:ring-1 focus:ring-white/50 focus:bg-white/25
                         transition-all"
            />
          </div>
        </div>
      )}

      {/* ── Navigation (scrollable) ── */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {filteredSections.map(section => (
          <div key={section.label}>
            {/* Section header */}
            <button
              onClick={() => !collapsed && toggleSection(section.label)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-white/90',
                'hover:bg-white/10 transition-colors',
                collapsed ? 'justify-center' : 'justify-between'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <section.icon className="h-4 w-4 shrink-0 text-white/80" />
                {!collapsed && (
                  <span className="truncate">{section.label}</span>
                )}
              </div>
              {!collapsed && (
                expandedSections[section.label]
                  ? <ChevronDown className="h-3.5 w-3.5 text-white/60 shrink-0" />
                  : <ChevronRight className="h-3.5 w-3.5 text-white/60 shrink-0" />
              )}
            </button>

            {/* Section items */}
            {(collapsed || expandedSections[section.label] || search) && (
              <div className="mb-1">
                {section.items.map(item => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'w-full flex items-center gap-2.5 rounded-lg mx-1 px-3 py-2 text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50',
                        collapsed ? 'justify-center mx-1 w-[calc(100%-8px)]' : '',
                        active
                          ? 'bg-white/20 text-white font-semibold'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      {!collapsed && (
                        <span className="truncate flex-1">{item.label}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/80 text-white rounded-full font-bold shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Autres portails (si rôles cumulés) */}
      {!collapsed && (hasParentRole || hasTeacherRole) && (
        <div className="px-3 pb-2 shrink-0 space-y-1.5">
          {hasParentRole && (
            <Link
              href="/parent-portal"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-white/30
                         text-white/80 text-xs font-medium hover:bg-white/10 transition-colors"
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              Portail parents
            </Link>
          )}
          {hasTeacherRole && (
            <Link
              href="/teacher-portal"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-white/30
                         text-white/80 text-xs font-medium hover:bg-white/10 transition-colors"
            >
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
              Portail enseignants
            </Link>
          )}
        </div>
      )}

      {/* ── Bas de sidebar : user + home ── */}
      <div className="shrink-0 border-t border-white/20">

        {/* User block — cliquable → ouvre le dialog profil */}
        {!collapsed && (
          <UserProfileDialog
            session={session}
            userFullName={userFullName}
            schoolName={schoolName}
          >
            <div className="flex items-center gap-2.5 px-4 py-3 hover:bg-white/10 transition-colors cursor-pointer w-full">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center
                              text-white text-xs font-bold shrink-0 border border-white/30">
                {getInitials(displayName)
                  ? <span>{getInitials(displayName)}</span>
                  : <User className="h-4 w-4 text-white/80" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold truncate leading-tight">{displayName}</p>
                <p className="text-white/60 text-xs truncate">{session.email}</p>
              </div>
            </div>
          </UserProfileDialog>
        )}

        {collapsed && (
          <UserProfileDialog
            session={session}
            userFullName={userFullName}
            schoolName={schoolName}
          >
            <div className="flex justify-center py-3 hover:bg-white/10 transition-colors cursor-pointer">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center
                              text-white text-xs font-bold border border-white/30">
                {getInitials(displayName) || <User className="h-4 w-4 text-white/80" />}
              </div>
            </div>
          </UserProfileDialog>
        )}

        {/* Accueil du portail */}
        <div className="px-3 pb-3">
          <Link
            href={ROUTES.admin.root}
            className={cn(
              'flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl',
              'bg-white/15 hover:bg-white/25 border border-white/20',
              'text-white text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-2' : ''
            )}
          >
            <Home className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Accueil du portail</span>}
          </Link>
        </div>
      </div>
    </div>
  )
}
