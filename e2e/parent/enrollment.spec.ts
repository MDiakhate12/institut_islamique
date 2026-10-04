import { test, expect, type Page } from '../support/fixtures'
import { storageStatePath, E2E_USERS } from '../support/users'
import { field, fillGuardians, uniqueSuffix } from '../support/registration-form'

// §7.4 — /parent-portal/enrollment réutilise le formulaire public. Un enfant a un badge de statut
// (non cliquable) dès qu'une registration existe pour lui ; un nouvel élève créé par le parent
// lui est lié tout de suite (submitterMemberId), sans passer par le flux OTP.
// Compte « family » : ces tests ajoutent des inscriptions et des enfants, « parent » reste intact.

test.use({ storageState: storageStatePath('family') })

/** Carte d'un enfant dans le sélecteur d'inscription (.last() : le bloc englobant est aussi un rounded-xl). */
const childCard = (page: Page, name: string) => page.locator('div.rounded-xl, a.rounded-xl').filter({ hasText: name }).last()

async function acceptPolicies(page: Page) {
  await page.getByRole('checkbox', { name: /J'ai lu et accepte les politiques/ }).check()
  await page.getByRole('checkbox', { name: /J'ai lu et j'accepte le règlement intérieur/ }).check()
}

test('réinscription d\'un enfant lié : il passe « En attente de validation »', async ({ page }) => {
  await page.goto('/parent-portal/enrollment')
  const sami = page.getByRole('link', { name: /Sami ENFANT/ })
  await expect(sami).toBeVisible()
  const reenrollHref = await sami.getAttribute('href')

  await sami.click()
  // L'élève est pré-rempli (non modifiable) en tête du formulaire
  const prefilled = page.locator('div').filter({ has: page.getByText('Élève :', { exact: true }) }).last()
  await expect(prefilled).toContainText('Sami ENFANT')

  await field(page, 'Niveau scolaire actuel').selectOption('CM2')
  await page.getByRole('button', { name: 'Annuellement' }).click()
  await acceptPolicies(page)
  await page.getByRole('button', { name: "Soumettre l'inscription" }).click()

  await expect(page).toHaveURL('/parent-portal/enrollment/success')
  await expect(page.getByRole('heading', { name: 'Inscription soumise !' })).toBeVisible()

  // De retour au sélecteur : badge « En attente de validation », plus de lien vers le formulaire
  await page.getByRole('link', { name: 'Soumettre une autre inscription' }).click()
  await expect(childCard(page, 'Sami ENFANT')).toContainText('En attente de validation')
  await expect(page.getByRole('link', { name: /Sami ENFANT/ })).toHaveCount(0)

  // Et l'URL directe du formulaire renvoie au sélecteur (pas de double inscription)
  await page.goto(reenrollHref!)
  await expect(page).toHaveURL('/parent-portal/enrollment')
})

test('nouvel élève inscrit par le parent : lié immédiatement à son compte', async ({ page }) => {
  await page.goto('/parent-portal/enrollment')
  await page.getByRole('link', { name: "Ajouter un nouvel élève à l'école" }).click()
  await expect(page).toHaveURL('/parent-portal/enrollment/new')

  // Bloc « Tuteurs » : le tuteur 1 est le parent connecté, nom et e-mail pré-remplis (e-mail non modifiable)
  await expect(page.locator('#guardian-0-name')).toHaveValue(E2E_USERS.family.fullName)
  await expect(page.locator('#guardian-0-email')).toHaveValue(E2E_USERS.family.email)
  await expect(page.locator('#guardian-0-email')).toHaveAttribute('readonly', '')
  await expect(page.locator('#guardian-0-relationship')).toHaveValue('guardian') // « Tuteur légal » par défaut
  await expect(page.getByText('Nom du père ou du tuteur')).toHaveCount(0)

  // Prénom unique : une relance ne doit pas être refusée comme doublon de la 1re tentative
  const first = `Lina${uniqueSuffix()}`
  await field(page, "Prénom de l'étudiant").fill(first)
  await field(page, "Nom de famille de l'étudiant").fill('enfant')
  await field(page, 'Date de naissance').fill('2018-01-15')
  await page.getByRole('button', { name: 'Féminin' }).click()
  await fillGuardians(page, { relation: 'Père', second: { relation: 'Mère', name: 'Maman E2E' } })
  await field(page, 'Niveau scolaire actuel').selectOption('CE2')
  await page.getByRole('button', { name: 'Annuellement' }).click()
  await acceptPolicies(page)
  await page.getByRole('button', { name: "Soumettre l'inscription" }).click()

  await expect(page).toHaveURL('/parent-portal/enrollment/success')

  // L'enfant apparaît dans « Mes enfants » sans validation admin ni code OTP
  await page.goto('/parent-portal/children')
  await expect(page.getByText(`${first} ENFANT`).first()).toBeVisible()

  // Et son inscription apparaît déjà dans le sélecteur, en attente de validation
  await page.goto('/parent-portal/enrollment')
  await expect(childCard(page, `${first} ENFANT`)).toContainText('En attente de validation')
})
