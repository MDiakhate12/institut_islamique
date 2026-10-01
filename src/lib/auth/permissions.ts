import type { Session } from './session'

export function hasRole(session: Session, role: string): boolean {
  return session.roles.includes(role as never)
}

export function isAdmin(session: Session): boolean {
  return hasRole(session, 'admin')
}

export function isTeacher(session: Session): boolean {
  return hasRole(session, 'teacher')
}

export function isParent(session: Session): boolean {
  return hasRole(session, 'parent')
}

// ── Sous-rôles admin ───────────────────────────────────────────────────────────
// Une "ressource" = le segment d'URL de la page admin (ex: 'students' pour
// /admin-portal/students, 'budget' pour /admin-portal/finance/budget).
//
// - admin     → tout
// - treasurer → Budget, Dépenses, Élèves et Annonces uniquement (liste blanche)
// - manager   → accès administrateur complet SAUF Budget & Dépenses (liste noire)

const FINANCE_RESOURCES = ['budget', 'expenses']

const TREASURER_RESOURCES = ['budget', 'expenses', 'students', 'announcements']

// Pages admin accessibles à tout sous-rôle (accueil, profil personnel)
const ALWAYS_ALLOWED = ['', 'profile']

type AccessSubject = Pick<Session, 'roles' | 'adminSubRole'>

export function canAccess(session: AccessSubject, resource: string): boolean {
  if (!session.roles.includes('admin') || !session.adminSubRole) return false
  if (ALWAYS_ALLOWED.includes(resource)) return true
  switch (session.adminSubRole) {
    case 'admin':     return true
    case 'treasurer': return TREASURER_RESOURCES.includes(resource)
    case 'manager':   return !FINANCE_RESOURCES.includes(resource)
  }
}

// '/admin-portal/finance/budget' → 'budget', '/admin-portal/students/123' → 'students'
// L'onboarding modifie les paramètres de l'école → même ressource que school-settings.
export function adminResourceFromPath(pathname: string): string | null {
  if (pathname !== '/admin-portal' && !pathname.startsWith('/admin-portal/')) return null
  const [first = '', second = ''] = pathname.slice('/admin-portal/'.length).split('/')
  if (first === 'finance') return second
  if (first === 'onboarding') return 'school-settings'
  return first
}

export function canAccessAdminPath(session: AccessSubject, pathname: string): boolean {
  const resource = adminResourceFromPath(pathname)
  return resource === null || canAccess(session, resource)
}
