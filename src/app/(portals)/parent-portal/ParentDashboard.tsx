'use client'

import Link from 'next/link'
import {
  Users, BookMarked, Music2, UserCheck, CalendarOff, Star,
  Megaphone, Library, CalendarDays, FileText, Clock, UserPlus,
  CalendarCheck, ExternalLink, Download,
} from 'lucide-react'

interface FeatureCard {
  label: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  bg: string
}

const FEATURE_CARDS: FeatureCard[] = [
  { label: 'Mes enfants',           description: 'Voir les classes inscrites',              href: '/parent-portal/children',      icon: Users,       bg: '#e8f5e9' },
  { label: 'Devoirs',               description: 'Suivre les devoirs',                      href: '/parent-portal/homework',      icon: BookMarked,  bg: '#ede7f6' },
  { label: 'Audio Coran',           description: 'Écouter des récitations',                 href: '/parent-portal/audio',         icon: Music2,      bg: '#e0f2f1' },
  { label: 'Présence',              description: 'Vérifier les registres de présence',      href: '/parent-portal/attendance',    icon: UserCheck,   bg: '#f1f8e9' },
  { label: 'Demander une absence',  description: "Notifier l'école des absences",           href: '/parent-portal/absence',       icon: CalendarOff, bg: '#fff3e0' },
  { label: 'Étoiles et trophées',   description: 'Voir les réalisations',                   href: '/parent-portal/stars',         icon: Star,        bg: '#fffde7' },
  { label: 'Annonces',              description: 'Dernières annonces',                      href: '/parent-portal/announcements', icon: Megaphone,   bg: '#fce4ec' },
  { label: 'Catalogue des classes', description: 'Parcourir toutes les classes',            href: '/parent-portal/catalog',       icon: Library,     bg: '#e8eaf6' },
  { label: 'Calendrier académique', description: 'Voir les événements scolaires et jours fériés', href: '/parent-portal/calendar', icon: CalendarDays, bg: '#f3e5f5' },
  { label: 'Voir les notes d\'examen', description: 'Voir les résultats de votre enfant',  href: '/parent-portal/exams',         icon: FileText,    bg: '#fce4ec' },
  { label: 'Emploi du temps',       description: 'Voir les horaires',                       href: '/parent-portal/schedule',      icon: Clock,       bg: '#eceff1' },
  { label: 'Inscrire mon enfant','description': 'Inscription de l\'année prochaine',    href: '/parent-portal/enrollment',    icon: Download,    bg: '#fbe9e7' },
]

interface Props {
  userFullName: string | null
}

export function ParentDashboard({ userFullName }: Props) {
  const displayName = userFullName ?? 'Parent'

  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portail Parents</h1>
          <p className="text-muted-foreground mt-0.5">Bon retour, {displayName}</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p className="capitalize">{dateStr}</p>
          <p className="text-lg font-semibold text-gray-900 tabular-nums">{timeStr}</p>
        </div>
      </div>

      {/* Bannière inscriptions */}
      <div className="relative overflow-hidden rounded-xl bg-[#c2440f] text-white p-6">
        <div className="relative z-10 max-w-lg">
          <h2 className="text-xl font-bold">Les inscriptions pour 2026-2027 sont ouvertes !</h2>
          <p className="text-white/80 text-sm mt-1">
            Réservez la place de votre enfant pour la prochaine année scolaire. L'inscription anticipée garantit
            une priorité de placement et l'accès à toutes les classes disponibles.
          </p>
          <Link
            href="/parent-portal/enrollment"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-white text-[#c2440f] rounded-lg
                       text-sm font-medium hover:bg-orange-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Inscrire mon enfant
          </Link>
        </div>
        {/* Icône décorative */}
        <CalendarCheck className="absolute right-6 top-1/2 -translate-y-1/2 h-24 w-24 text-white/20" />
      </div>

      {/* Bannière guide */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-pink-50 border border-pink-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-pink-200 flex items-center justify-center shrink-0">
            <Music2 className="h-4 w-4 text-pink-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Nouveau sur Qaf ? Regardez le guide portail parents</p>
            <p className="text-xs text-muted-foreground">Visite complète du portail parents — 12 min</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white
                           rounded-lg text-xs font-medium transition-colors shrink-0">
          <ExternalLink className="h-3.5 w-3.5" />
          Regarder
        </button>
      </div>

      {/* Grille de fonctionnalités */}
      <div className="grid grid-cols-3 gap-3">
        {FEATURE_CARDS.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="flex flex-col gap-2 p-4 rounded-xl border border-transparent
                       hover:border-gray-200 hover:shadow-sm transition-all"
            style={{ backgroundColor: card.bg }}
          >
            <card.icon className="h-6 w-6 text-gray-600" />
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-snug">{card.label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
