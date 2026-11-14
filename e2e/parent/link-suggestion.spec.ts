import { test, expect } from '../support/fixtures'
import { E2E_SCHOOL, SUGGESTION_PARENT_EMAIL } from '../support/users'

// Parcours simplifié : un parent qui crée son compte avec l'e-mail enregistré par l'école se voit
// proposer son enfant (un clic), sans code à recopier. L'école est imposée par le lien (?school=).

test('parent : l\'enfant est proposé d\'après l\'e-mail du compte, puis lié en un clic', async ({ page }) => {
  await page.goto(`/auth/signup?school=${E2E_SCHOOL.slug}&email=${encodeURIComponent(SUGGESTION_PARENT_EMAIL)}`)

  // École imposée : plus de liste déroulante
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.locator(`input[value="${E2E_SCHOOL.name}"]`)).toBeVisible()

  const password = `E2e-${Date.now()}!`
  await page.getByPlaceholder('Prénom Nom').fill('Mère PROPOSITION')
  await page.getByPlaceholder('0X XX XX XX XX').fill('0612345678')
  await page.getByPlaceholder('••••••••').first().fill(password)
  await page.getByPlaceholder('••••••••').last().fill(password)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Créer un compte' }).click()

  await expect(page).toHaveURL(/\/parent-portal/)
  await expect(page.getByText('Est-ce votre enfant ?')).toBeVisible()
  await expect(page.getByText('Lina PROPOSITION')).toBeVisible()

  await page.getByRole('button', { name: 'Oui, les lier à mon compte' }).click()
  await expect(page.getByText('1 élève(s) lié(s) avec succès !')).toBeVisible()
  await expect(page.getByText('Est-ce votre enfant ?')).toBeHidden()

  await page.goto('/parent-portal/children')
  await expect(page.getByRole('button', { name: 'Lina PROPOSITION' })).toBeVisible()
})

test('parent sans enfant : deux chemins clairs au lieu d\'un état vide', async ({ browser }) => {
  // Compte `family` sans liaison automatique possible : on vérifie seulement les cartes de départ
  // pour un parent qui n'a aucun enfant lié ni proposition (nouveau compte, e-mail inconnu de l'école)
  const page = await browser.newPage()
  const email = `sans.enfant.${Date.now()}@e2e.qaf.test`
  const password = `E2e-${Date.now()}!`
  await page.goto(`/auth/signup?school=${E2E_SCHOOL.slug}&email=${encodeURIComponent(email)}`)
  await page.getByPlaceholder('Prénom Nom').fill('Parent SANSENFANT')
  await page.getByPlaceholder('0X XX XX XX XX').fill('0612345678')
  await page.getByPlaceholder('••••••••').first().fill(password)
  await page.getByPlaceholder('••••••••').last().fill(password)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Créer un compte' }).click()

  await expect(page).toHaveURL(/\/parent-portal/)
  await expect(page.getByText('Mon enfant est déjà inscrit')).toBeVisible()
  await expect(page.getByText('Inscrire un nouvel enfant')).toBeVisible()
  await page.close()
})
