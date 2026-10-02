import type { Page } from './fixtures'

/**
 * Champ de PublicRegistrationForm par son libellé. Les <label> du formulaire n'ont pas de
 * htmlFor → getByLabel ne marche pas ; on prend le champ du même bloc que le label.
 * Formulaire partagé par /portal/register/[schoolSlug] et /parent-portal/enrollment (§7.4).
 */
export function field(page: Page, label: string) {
  return page
    .locator('div')
    .filter({ has: page.locator(':scope > label', { hasText: label }) })
    .locator('input, select, textarea')
    .first()
}
