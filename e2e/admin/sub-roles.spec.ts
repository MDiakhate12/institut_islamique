import { test, expect } from '../support/fixtures'
import { storageStatePath } from '../support/users'

// §7.17 — proxy.ts redirige vers /admin-portal toute page admin non autorisée par le sous-rôle.

test.describe('non connecté', () => {
  test('une page de portail renvoie vers le login avec redirect', async ({ page }) => {
    await page.goto('/admin-portal/students')
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fadmin-portal%2Fstudents/)
  })
})

const cases = [
  // [rôle, page, autorisée ?]
  ['admin', '/admin-portal/finance/budget', true],
  ['admin', '/admin-portal/permissions', true],
  ['treasurer', '/admin-portal/finance/budget', true],
  ['treasurer', '/admin-portal/finance/expenses', true],
  ['treasurer', '/admin-portal/students', true],
  ['treasurer', '/admin-portal/teachers', false],
  ['treasurer', '/admin-portal/school-settings', false],
  ['treasurer', '/admin-portal/permissions', false],
  ['manager', '/admin-portal/teachers', true],
  ['manager', '/admin-portal/school-settings', true],
  ['manager', '/admin-portal/finance/budget', false],
  ['manager', '/admin-portal/finance/expenses', false],
  ['manager', '/admin-portal/permissions', false],
] as const

for (const [role, path, allowed] of cases) {
  test.describe(role, () => {
    test.use({ storageState: storageStatePath(role) })

    test(`${allowed ? 'accède à' : 'est redirigé depuis'} ${path}`, async ({ page }) => {
      await page.goto(path)
      if (allowed) {
        await expect(page).toHaveURL(path)
      } else {
        await expect(page).toHaveURL(/\/admin-portal\/?$/)
      }
    })
  })
}

test.describe('rôles hors admin', () => {
  test.describe('enseignant', () => {
    test.use({ storageState: storageStatePath('teacher') })
    test('est renvoyé vers son portail depuis /admin-portal', async ({ page }) => {
      await page.goto('/admin-portal')
      await expect(page).toHaveURL(/\/teacher-portal/)
    })
  })
})
