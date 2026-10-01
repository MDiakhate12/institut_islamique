import { test, expect, type Page } from '../support/fixtures'
import { storageStatePath, E2E_SCHOOL } from '../support/users'

// §7.4 — le formulaire public crée immédiatement l'élève + ses tuteurs, puis la
// registration 'pending'. L'admin la retrouve dans Inscriptions, et l'élève dans Étudiants.

/**
 * Champ du formulaire public par son libellé. Les <label> de PublicRegistrationForm n'ont
 * pas de htmlFor → getByLabel ne marche pas ; on prend le champ du même bloc que le label.
 */
function field(page: Page, label: string) {
  return page
    .locator('div')
    .filter({ has: page.locator(':scope > label', { hasText: label }) })
    .locator('input, select, textarea')
    .first()
}

test('inscription publique d\'un nouvel élève, visible côté admin', async ({ page, browser }) => {
  await page.goto(`/portal/register/${E2E_SCHOOL.slug}`)
  await expect(page.getByRole('heading', { name: `Inscription à ${E2E_SCHOOL.name}` })).toBeVisible()

  await field(page, "Prénom de l'étudiant").fill('Inès')
  await field(page, "Nom de famille de l'étudiant").fill('benali')
  await expect(field(page, "Nom de famille de l'étudiant")).toHaveValue('BENALI') // mis en majuscules à la saisie
  await field(page, 'Date de naissance').fill('2016-03-08')
  await page.getByRole('button', { name: 'Féminin' }).click()
  await field(page, 'Nom du père ou du tuteur').fill('Karim BENALI')
  await field(page, 'Nom de la mère ou du tuteur').fill('Samia BENALI')
  await field(page, 'E-mail principal').fill('karim.benali@example.com')
  await field(page, 'Téléphone principal').fill('0611223344')
  await field(page, 'Niveau scolaire actuel').selectOption('CM1')
  await page.getByRole('button', { name: 'Annuellement' }).click()
  await page.getByRole('checkbox', { name: /J'ai lu et accepte les politiques/ }).check()
  await page.getByRole('checkbox', { name: /J'ai lu et j'accepte le règlement intérieur/ }).check()

  await page.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(page).toHaveURL(`/portal/register/${E2E_SCHOOL.slug}/success`)

  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  const adminErrors: Error[] = []
  admin.on('pageerror', e => adminErrors.push(e))

  // L'inscription apparaît dans la liste admin avec l'élève et le parent
  await admin.goto('/admin-portal/registrations')
  const registration = admin.getByRole('row').filter({ hasText: 'Inès BENALI' })
  await expect(registration).toBeVisible()
  await expect(registration).toContainText('Karim BENALI')
  await expect(registration).toContainText('karim.benali@example.com')

  // L'élève a été créé immédiatement (sans attendre de validation)
  await admin.goto('/admin-portal/students')
  await admin.getByPlaceholder(/Rechercher des élèves/).fill('BENALI')
  await expect(admin.getByRole('row').filter({ hasText: 'Inès' })).toBeVisible()

  expect(adminErrors).toEqual([])
  await admin.close()
})

// Les champs marqués * ne sont validés NI côté client (PublicRegistrationForm) NI côté serveur
// (submitRegistrationAction) : un formulaire vide est accepté et crée une registration sans élève.
// À activer une fois la validation des champs requis ajoutée.
test.fixme('le formulaire public refuse une soumission sans les champs requis', async ({ page }) => {
  await page.goto(`/portal/register/${E2E_SCHOOL.slug}`)
  await page.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(page).toHaveURL(`/portal/register/${E2E_SCHOOL.slug}`)
})
