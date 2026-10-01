import { test, expect, expectPageOk } from './support/fixtures'
import { storageStatePath, type E2ERole } from './support/users'

// Chaque page construite (CLAUDE.md §8) s'affiche sans erreur serveur ni exception JS.
// Le tag @mobile fait aussi tourner ces tests sur le projet "mobile" (Pixel 7).

// Pages qui redirigent volontairement ailleurs (redirect() dans leur page.tsx)
const REDIRECTS: Record<string, string> = {
  '/admin-portal/class-catalog': '/admin-portal/classes',
  '/teacher-portal': '/teacher-portal/homework',
  '/teacher-portal/catalog': '/teacher-portal/classes',
  '/parent-portal/catalog': '/parent-portal/children',
}

const PAGES: Record<'admin' | 'teacher' | 'parent', string[]> = {
  admin: [
    '/admin-portal',
    '/admin-portal/students',
    '/admin-portal/teachers',
    '/admin-portal/classes',
    '/admin-portal/class-catalog',
    '/admin-portal/academic-calendar',
    '/admin-portal/registration-forms',
    '/admin-portal/registrations',
    '/admin-portal/school-settings',
    '/admin-portal/attendance',
    '/admin-portal/homework',
    '/admin-portal/parents',
    '/admin-portal/announcements',
    '/admin-portal/permissions',
    '/admin-portal/track-exams',
    '/admin-portal/finance/budget',
    '/admin-portal/finance/expenses',
    '/admin-portal/profile',
  ],
  teacher: [
    '/teacher-portal',
    '/teacher-portal/classes',
    '/teacher-portal/homework',
    '/teacher-portal/attendance',
    '/teacher-portal/announcements',
    '/teacher-portal/audio',
    '/teacher-portal/calendar',
    '/teacher-portal/catalog',
    '/teacher-portal/exams',
    '/teacher-portal/refunds',
    '/teacher-portal/profile',
  ],
  parent: [
    '/parent-portal',
    '/parent-portal/children',
    '/parent-portal/enrollment',
    '/parent-portal/homework',
    '/parent-portal/announcements',
    '/parent-portal/attendance',
    '/parent-portal/audio',
    '/parent-portal/calendar',
    '/parent-portal/catalog',
    '/parent-portal/exams',
    '/parent-portal/payments',
    '/parent-portal/profile',
  ],
}

for (const [role, paths] of Object.entries(PAGES) as [E2ERole, string[]][]) {
  test.describe(`smoke ${role} @mobile`, () => {
    test.use({ storageState: storageStatePath(role) })

    for (const path of paths) {
      test(path, async ({ page }) => {
        const response = await page.goto(path)
        expect(response?.status(), `HTTP ${path}`).toBeLessThan(400)
        const expected = REDIRECTS[path] ?? path
        await expect(page).toHaveURL(new RegExp(`${expected}/?(\\?|$)`))
        await expect(page.getByRole('heading').first()).toBeVisible()
        await expectPageOk(page)
      })
    }
  })
}

test.describe('public @mobile', () => {
  test('formulaire d\'inscription public', async ({ page }) => {
    const response = await page.goto('/portal/register/e2e-school')
    expect(response?.status()).toBeLessThan(400)
    await expectPageOk(page)
  })
})
