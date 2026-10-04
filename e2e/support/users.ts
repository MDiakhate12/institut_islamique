/**
 * Comptes de test créés par `e2e/seed.ts` dans l'école E2E.
 * Mot de passe commun : process.env.E2E_PASSWORD (généré dans .env.test).
 */
export const E2E_SCHOOL = { name: 'École E2E', slug: 'e2e-school' } as const
/** École sans compte dont les nouvelles inscriptions sont fermées. */
export const E2E_CLOSED_SCHOOL = { name: 'École E2E Fermée', slug: 'e2e-closed' } as const
/** École sans compte dont le formulaire exige le second tuteur (avec son e-mail). */
export const E2E_TWO_GUARDIANS_SCHOOL = { name: 'École E2E Deux Tuteurs', slug: 'e2e-two-guardians' } as const

export const E2E_EMAIL_DOMAIN = 'e2e.qaf.test'

export const E2E_USERS = {
  admin:     { email: `admin@${E2E_EMAIL_DOMAIN}`,     fullName: 'Admin E2E',        portalRoles: ['admin'],   adminSubRole: 'admin' },
  treasurer: { email: `treasurer@${E2E_EMAIL_DOMAIN}`, fullName: 'Trésorier E2E',    portalRoles: ['admin'],   adminSubRole: 'treasurer' },
  manager:   { email: `manager@${E2E_EMAIL_DOMAIN}`,   fullName: 'Gestionnaire E2E', portalRoles: ['admin'],   adminSubRole: 'manager' },
  teacher:   { email: `teacher@${E2E_EMAIL_DOMAIN}`,   fullName: 'Enseignant E2E',   portalRoles: ['teacher'], adminSubRole: null },
  parent:    { email: `parent@${E2E_EMAIL_DOMAIN}`,    fullName: 'Parent E2E',       portalRoles: ['parent'],  adminSubRole: null },
  // Parent réservé aux tests d'inscription (ajoute des enfants) : « parent » garde un seul enfant,
  // dont dépendent les tests qui prennent le premier enfant affiché (présences, devoirs)
  family:    { email: `family@${E2E_EMAIL_DOMAIN}`,    fullName: 'Famille E2E',      portalRoles: ['parent'],  adminSubRole: null },
} as const

export type E2ERole = keyof typeof E2E_USERS

export const E2E_ROLES = Object.keys(E2E_USERS) as E2ERole[]

export const storageStatePath = (role: E2ERole) => `e2e/.auth/${role}.json`
