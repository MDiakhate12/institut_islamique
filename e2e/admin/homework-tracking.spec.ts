import { test, expect } from '../support/fixtures'
import { storageStatePath } from '../support/users'

// Suivi des devoirs (admin) : navigation jour par jour. Régression couverte : les dates étaient
// créées à minuit local puis relues en UTC → à Paris « Jour suivant » ne bougeait pas et
// « Jour précédent » reculait de 2 jours (src/lib/dates.ts). Le seed déclare les 7 jours en jours de classe.

test.use({ storageState: storageStatePath('admin') })

/** Libellé affiché pour une date ISO, tel que fmtLongDate le produit (ex. « vendredi 2 octobre 2026 »). */
function label(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}
function shift(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

test('suivi des devoirs : jour précédent / suivant / aujourd\'hui', async ({ page }) => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }) // fuseau de l'école E2E
  const dateHeading = (iso: string) => page.getByText(label(iso), { exact: true })

  await page.goto('/admin-portal/homework')
  await expect(dateHeading(today)).toBeVisible()

  await page.getByRole('button', { name: 'Jour précédent' }).click()
  await expect(dateHeading(shift(today, -1))).toBeVisible()
  await page.getByRole('button', { name: 'Jour précédent' }).click()
  await expect(dateHeading(shift(today, -2))).toBeVisible()

  await page.getByRole('button', { name: 'Jour suivant' }).click()
  await expect(dateHeading(shift(today, -1))).toBeVisible()

  await page.getByRole('button', { name: "Aller à aujourd'hui" }).click()
  await expect(dateHeading(today)).toBeVisible()
})
