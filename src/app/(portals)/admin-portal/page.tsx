import { requireSession } from '@/lib/auth/session'
import { db } from '@/db'
import { profiles, schools } from '@/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import {
  Users, GraduationCap, BookOpen, ClipboardList, CalendarCheck,
  BookMarked, Star, BookCopy, CalendarDays, BarChart3, Library,
  ArrowLeftRight, UserPlus, FileText,
  CreditCard, Receipt,
  StickyNote, Mail, UserSquare2, Megaphone, Cake,
  Trophy, Tv,
  Settings, Shield, RefreshCw, UserCog, Sparkles, Lightbulb,
  Home,
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { AdminHomeClock } from './AdminHomeClock'
import type { LucideIcon } from 'lucide-react'

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

interface NavItem { label: string; href: string; icon: LucideIcon; badge?: string }
interface NavSection { label: string; items: NavItem[] }

const SECTIONS: NavSection[] = [
  {
    label: 'Gestion académique',
    items: [
      { label: 'Étudiants',                   href: ROUTES.admin.students,          icon: Users },
      { label: 'Enseignants',                  href: ROUTES.admin.teachers,          icon: GraduationCap },
      { label: 'Classes',                      href: ROUTES.admin.classes,           icon: BookOpen },
      { label: 'Suivi des notes d\'examens',   href: ROUTES.admin.trackExams,        icon: ClipboardList },
      { label: 'Suivi des présences',          href: ROUTES.admin.attendance,        icon: CalendarCheck },
      { label: 'Suivi des devoirs',            href: ROUTES.admin.homework,          icon: BookMarked },
      { label: 'Suivi des étoiles',            href: ROUTES.admin.trackStars,        icon: Star },
      { label: 'Catalogue des classes',        href: ROUTES.admin.classCatalog,      icon: BookCopy },
      { label: 'Calendrier académique',        href: ROUTES.admin.calendar,          icon: CalendarDays },
      { label: 'Rapports et analyses',         href: ROUTES.admin.reports,           icon: BarChart3 },
      { label: 'Suivi des livres',             href: ROUTES.admin.bookTracking,      icon: Library },
      { label: 'Remplacements',                href: ROUTES.admin.substitutions,     icon: ArrowLeftRight },
      { label: 'Inscriptions',                 href: ROUTES.admin.registrations,     icon: UserPlus },
      { label: 'Formulaires d\'inscription',   href: ROUTES.admin.registrationForms, icon: FileText },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Budget',   href: ROUTES.admin.budget,   icon: CreditCard },
      { label: 'Dépenses', href: ROUTES.admin.expenses,  icon: Receipt },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Notes autocollantes', href: ROUTES.admin.stickyNotes,   icon: StickyNote },
      { label: 'Envoyer un e-mail',   href: ROUTES.admin.sendEmail,     icon: Mail },
      { label: 'Parents',             href: ROUTES.admin.parents,       icon: UserSquare2 },
      { label: 'Annonces',            href: ROUTES.admin.announcements, icon: Megaphone },
      { label: 'Anniversaires',       href: ROUTES.admin.birthdays,     icon: Cake },
    ],
  },
  {
    label: 'TV',
    items: [
      { label: 'Classement',          href: ROUTES.admin.rankings, icon: Trophy },
      { label: 'Application Qaf TV',  href: ROUTES.admin.tv,       icon: Tv, badge: 'New' },
    ],
  },
  {
    label: 'Paramètres',
    items: [
      { label: 'Paramètres de l\'école',       href: ROUTES.admin.schoolSettings, icon: Settings },
      { label: 'Autorisations',                href: ROUTES.admin.permissions,    icon: Shield },
      { label: 'Réinitialiser',                href: ROUTES.admin.startNewYear,   icon: RefreshCw },
      { label: 'Paramètres du profil',         href: ROUTES.admin.profile,        icon: UserCog },
      { label: 'Nouveautés',                   href: ROUTES.admin.roadmap,        icon: Sparkles },
      { label: 'Demandes de fonctionnalités',  href: ROUTES.admin.roadmap,        icon: Lightbulb },
    ],
  },
]

export default async function AdminDashboardPage() {
  const session = await requireSession()

  const [schoolResult, profileResult] = await Promise.all([
    db.select({ name: schools.name }).from(schools).where(eq(schools.id, session.schoolId)).limit(1),
    db.select({ fullName: profiles.fullName }).from(profiles).where(eq(profiles.userId, session.userId)).limit(1),
  ])

  const schoolName  = schoolResult[0]?.name ?? null
  const userFullName = profileResult[0]?.fullName ?? null
  const displayName = userFullName ?? session.email.split('@')[0]
  // Only the first name for the welcome greeting
  const firstName = displayName.split(' ')[0]

  return (
    // Fond doré — remplace le bg-[#FFF8F0] du layout
    <div className="min-h-full bg-gradient-to-br from-[#DBA571] via-[#C89A68] to-[#A67C52] relative overflow-x-hidden">

      {/* ── Orbes lumineux décoratifs ── */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-gradient-to-br from-white/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-gradient-to-br from-white/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── Motif diamants en filigrane ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.07]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="diamonds" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <rect x="40" y="10" width="28" height="28" transform="rotate(45 40 24)" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diamonds)" />
        </svg>
      </div>

      {/* ── En-tête de bienvenue ── */}
      <div className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-9 pb-4 sm:py-12">
          <div className="flex justify-between items-start gap-4 mb-6">

            {/* Gauche : titre + rôles */}
            <div className="flex items-start gap-3">
              {/* Bouton accueil (tourne au hover) */}
              <Link href={ROUTES.admin.root} className="group mt-1">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl hover:bg-white/25 transition-all duration-300 shadow-xl group-hover:rotate-45">
                  <Home className="h-5 w-5 text-white" />
                </div>
              </Link>
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-white drop-shadow-2xl">
                  Bienvenue, {firstName}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {session.roles.map(role => (
                    <span
                      key={role}
                      className={`px-3 py-1 rounded-full border text-sm font-medium ${ROLE_BADGE_CLASSES[role] ?? 'bg-white/20 text-white border-white/30'}`}
                    >
                      {ROLE_LABELS[role] ?? role}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Droite : école + horloge */}
            <div className="hidden sm:flex flex-col items-end gap-1">
              {schoolName && (
                <p className="text-white/80 text-base sm:text-lg font-mono drop-shadow-lg">
                  {schoolName}
                </p>
              )}
              <AdminHomeClock />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections de navigation ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {SECTIONS.map(section => (
          <div key={section.label} className="mb-12">

            {/* En-tête de section */}
            <div className="text-center mb-8">
              {/* Icône décorative */}
              <svg className="w-16 h-4 sm:w-24 sm:h-6 text-white mx-auto mb-3 opacity-80" viewBox="0 0 120 40">
                <circle cx="60" cy="20" r="5" fill="currentColor" />
                <line x1="0" y1="20" x2="50" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                <line x1="70" y1="20" x2="120" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
              </svg>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 drop-shadow-2xl font-mono">
                {section.label}
              </h3>
              <div className="h-0.5 sm:h-1 w-24 sm:w-32 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-full mx-auto" />
            </div>

            {/* Grille de cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
              {section.items.map(item => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="group cursor-pointer relative w-full"
                >
                  <div className="bg-gradient-to-br from-white/30 to-white/15 hover:from-white/40 hover:to-white/25 w-full h-36 sm:h-40 md:h-44 rounded-2xl sm:rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden border border-white/40 backdrop-blur-xl group-hover:scale-[1.03]">

                    {/* Coins décoratifs */}
                    <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white/50 rounded-tl-xl" />
                    <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white/50 rounded-tr-xl" />
                    <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-white/50 rounded-bl-xl" />
                    <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-white/50 rounded-br-xl" />

                    {/* Badge (ex: "New") */}
                    {item.badge && (
                      <div className="absolute top-2 right-2 z-10 text-[10px] px-1.5 py-0.5 bg-orange-500 text-white rounded-full font-bold">
                        {item.badge}
                      </div>
                    )}

                    {/* Icône */}
                    <div className="bg-gradient-to-br from-[#DBA571]/95 to-[#8B4429]/95 backdrop-blur-xl p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-2 sm:mb-3 group-hover:scale-110 transition-all duration-300 shadow-lg">
                      <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>

                    {/* Label */}
                    <p className="font-bold text-sm sm:text-base text-white text-center drop-shadow leading-tight">
                      {item.label}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
