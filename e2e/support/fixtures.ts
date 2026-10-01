import { test as base, expect, type Page } from '@playwright/test'

/**
 * Échoue le test si la page lève une exception JS non interceptée
 * (erreur d'hydratation, crash d'un composant client…).
 */
export const test = base.extend<{ pageErrors: Error[] }>({
  pageErrors: [async ({ page }, use) => {
    const errors: Error[] = []
    page.on('pageerror', e => errors.push(e))
    await use(errors)
    expect(errors, `Exceptions JS sur ${page.url()}`).toEqual([])
  }, { auto: true }],
})

export { expect }
export type { Page }

/** Attend que l'app ait fini de naviguer et vérifie qu'on n'est pas tombé sur une page d'erreur Next. */
export async function expectPageOk(page: Page) {
  await expect(page.getByText(/Application error|Internal Server Error|This page could not be found/i)).toHaveCount(0)
}
