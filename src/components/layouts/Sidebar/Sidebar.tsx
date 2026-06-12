'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Users, GraduationCap, BookOpen, ClipboardList, CalendarCheck,
  BookMarked, Star, BookCopy, CalendarDays, BarChart3, Library,
  ArrowLeftRight, CreditCard, Receipt, Mail, Megaphone, UserSquare2,
  StickyNote, Cake, Shield, RefreshCw, Map, Settings, ChevronDown,
  ChevronRight, Home, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Académique',
    items: [
      { label: 'Élèves', href: ROUTES.admin.students, icon: Users },
      { label: 'Enseignants', href: ROUTES.admin.teachers, icon: GraduationCap },
      { label: 'Classes', href: ROUTES.admin.classes, icon: BookOpen },
      { label: 'Examens', href: ROUTES.admin.trackExams, icon: ClipboardList },
      { label: 'Présences', href: ROUTES.admin.attendance, icon: CalendarCheck },
      { label: 'Devoirs', href: ROUTES.admin.homework, icon: BookMarked },
      { label: 'Étoiles', href: ROUTES.admin.trackStars, icon: Star },
      { label: 'Catalogue', href: ROUTES.admin.classCatalog, icon: BookCopy },
      { label: 'Calendrier', href: ROUTES.admin.calendar, icon: CalendarDays },
      { label: 'Rapports', href: ROUTES.admin.reports, icon: BarChart3 },
      { label: 'Livres', href: ROUTES.admin.bookTracking, icon: Library },
      { label: 'Substitutions', href: ROUTES.admin.substitutions, icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Budget', href: ROUTES.admin.budget, icon: CreditCard },
      { label: 'Dépenses', href: ROUTES.admin.expenses, icon: Receipt },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Email', href: ROUTES.admin.sendEmail, icon: Mail },
      { label: 'Annonces', href: ROUTES.admin.announcements, icon: Megaphone },
      { label: 'Parents', href: ROUTES.admin.parents, icon: UserSquare2 },
    ],
  },
]

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Inscriptions', href: ROUTES.admin.registrations, icon: ClipboardList },
  { label: 'Formulaires', href: ROUTES.admin.registrationForms, icon: BookOpen },
  { label: 'Mémos', href: ROUTES.admin.stickyNotes, icon: StickyNote },
  { label: 'Anniversaires', href: ROUTES.admin.birthdays, icon: Cake },
  { label: 'Permissions', href: ROUTES.admin.permissions, icon: Shield },
  { label: 'Nouvelle année', href: ROUTES.admin.startNewYear, icon: RefreshCw },
  { label: 'Roadmap', href: ROUTES.admin.roadmap, icon: Map },
  { label: 'Paramètres', href: ROUTES.admin.schoolSettings, icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Académique: true,
    Finance: true,
    Communication: true,
  })

  function toggleSection(label: string) {
    setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }))
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link href={ROUTES.admin.root} className="flex items-center gap-2">
            <span className="font-bold text-lg text-sidebar-foreground">Qaf School</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors ml-auto"
          aria-label={collapsed ? 'Ouvrir la sidebar' : 'Réduire la sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {/* Accueil portail */}
        <NavLink href={ROUTES.admin.root} icon={Home} label="Accueil du portail" collapsed={collapsed} active={pathname === ROUTES.admin.root} />

        {/* Sections dépliables */}
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <button
                onClick={() => toggleSection(section.label)}
                className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              >
                {section.label}
                {expandedSections[section.label]
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />
                }
              </button>
            )}
            {(collapsed || expandedSections[section.label]) && (
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    collapsed={collapsed}
                    active={isActive(item.href)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Séparateur */}
        <div className="mx-4 my-2 border-t border-sidebar-border/50" />

        {/* Items du bas */}
        {BOTTOM_ITEMS.map(item => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            active={isActive(item.href)}
          />
        ))}
      </nav>
    </aside>
  )
}

interface NavLinkProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  collapsed: boolean
  active: boolean
}

function NavLink({ href, icon: Icon, label, collapsed, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 px-4 py-2 text-sm transition-colors rounded-none',
        active
          ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}
