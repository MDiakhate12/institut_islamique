import type { Session } from './session'
import type { AdminSubRole } from '@/lib/constants'

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

// Sous-rôles admin
const SUB_ROLE_PERMISSIONS: Record<AdminSubRole, string[]> = {
  admin: ['*'],
  treasurer: ['budget', 'expenses', 'students', 'announcements'],
  manager: ['students', 'teachers', 'classes', 'attendance', 'homework', 'exams',
             'stars', 'calendar', 'registrations', 'substitutions', 'books',
             'communication', 'announcements', 'parents', 'permissions'],
}

export function canAccess(session: Session, resource: string): boolean {
  if (!session.adminSubRole) return false
  const perms = SUB_ROLE_PERMISSIONS[session.adminSubRole]
  return perms.includes('*') || perms.includes(resource)
}
