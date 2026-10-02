import { test, expect } from '../support/fixtures'
import { storageStatePath, E2E_SCHOOL } from '../support/users'
import { field } from '../support/registration-form'

// §7.4 — le formulaire public crée immédiatement l'élève + ses tuteurs, puis la
// registration 'pending'. L'admin la retrouve dans Inscriptions, et l'élève dans Étudiants.

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

test('le formulaire public refuse une soumission sans les champs requis', async ({ page, browser }) => {
  await page.goto(`/portal/register/${E2E_SCHOOL.slug}`)
  const errors = page.getByText('Ce champ est requis')

  await page.getByRole('button', { name: "Soumettre l'inscription" }).click()

  // 12 champs requis dans le formulaire par défaut (identité, parents, contact, niveau,
  // fréquence de paiement, 2 cases d'acceptation) — l'année, en lecture seule, est exclue
  await expect(page.getByText('Veuillez remplir les 12 champs obligatoires')).toBeVisible()
  await expect(errors).toHaveCount(12)
  await expect(page).toHaveURL(`/portal/register/${E2E_SCHOOL.slug}`)

  // L'erreur d'un champ disparaît dès qu'il est rempli
  await field(page, "Prénom de l'étudiant").fill('Partiel')
  await page.getByRole('button', { name: 'Masculin' }).click()
  await page.getByRole('checkbox', { name: /J'ai lu et j'accepte le règlement intérieur/ }).check()
  await expect(errors).toHaveCount(9)

  await page.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(page.getByText('Veuillez remplir les 9 champs obligatoires')).toBeVisible()

  // Rien n'a été créé côté admin
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  // On s'appuie sur le compteur « N élève(s) » de l'en-tête (résultat filtré), pas sur le
  // libellé de l'état vide, qui change selon la version du tableau.
  await admin.goto('/admin-portal/students')
  const search = admin.getByPlaceholder(/Rechercher des élèves/)
  await search.fill('TESTEUR') // contrôle positif : la recherche trouve bien l'élève du seed
  await expect(admin.getByText('1 élève', { exact: true })).toBeVisible()
  await search.fill('Partiel')
  await expect(admin.getByText('0 élèves', { exact: true })).toBeVisible()
  await admin.close()
})
