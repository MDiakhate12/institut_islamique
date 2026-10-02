import { test, expect } from '../support/fixtures'
import { storageStatePath, E2E_SCHOOL } from '../support/users'
import { field, fillGuardians, uniqueSuffix } from '../support/registration-form'

// §7.4 — le formulaire public crée immédiatement l'élève + ses tuteurs, puis la
// registration 'pending'. L'admin la retrouve dans Inscriptions ; l'élève n'entre dans le tableau
// Élèves qu'une fois l'inscription approuvée.

test('inscription publique d\'un nouvel élève, visible côté admin', async ({ page, browser }) => {
  // Nom unique : une relance ne doit pas être refusée comme doublon de la 1re tentative
  const last = `BENALI${uniqueSuffix().toUpperCase()}`
  await page.goto(`/portal/register/${E2E_SCHOOL.slug}`)
  await expect(page.getByRole('heading', { name: `Inscription à ${E2E_SCHOOL.name}` })).toBeVisible()

  await field(page, "Prénom de l'étudiant").fill('Inès')
  await field(page, "Nom de famille de l'étudiant").fill(last.toLowerCase())
  await expect(field(page, "Nom de famille de l'étudiant")).toHaveValue(last) // mis en majuscules à la saisie
  await field(page, 'Date de naissance').fill('2016-03-08')
  await page.getByRole('button', { name: 'Féminin' }).click()
  // Bloc « Tuteurs » (même composant que le portail parent) : tuteur principal + second tuteur
  await fillGuardians(page, {
    relation: 'Père', name: 'Karim BENALI', phone: '0611223344', email: 'karim.benali@example.com',
    second: { relation: 'Mère', name: 'Samia BENALI' },
  })
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
  const registration = admin.getByRole('row').filter({ hasText: `Inès ${last}` })
  await expect(registration).toBeVisible()
  await expect(registration).toContainText('Karim BENALI')
  await expect(registration).toContainText('karim.benali@example.com')

  // Pas encore dans le tableau Élèves : il n'y entre qu'une fois l'inscription approuvée
  await admin.goto('/admin-portal/students')
  const search = admin.getByPlaceholder(/Rechercher des élèves/)
  await search.fill(last)
  await expect(admin.getByText('0 élèves', { exact: true })).toBeVisible()

  // Approbation → l'élève apparaît dans le tableau
  await admin.goto('/admin-portal/registrations')
  await registration.click()
  await admin.locator('section').filter({ hasText: 'Décision' }).getByRole('button', { name: 'Approuver' }).click()
  await expect(admin.getByText('Inscription approuvée')).toBeVisible()
  await admin.goto('/admin-portal/students')
  await search.fill(last)
  await expect(admin.getByRole('row').filter({ hasText: 'Inès' })).toBeVisible()

  expect(adminErrors).toEqual([])
  await admin.close()
})

test('le formulaire public refuse une soumission sans les champs requis', async ({ page, browser }) => {
  await page.goto(`/portal/register/${E2E_SCHOOL.slug}`)
  const errors = page.getByText('Ce champ est requis')

  await page.getByRole('button', { name: "Soumettre l'inscription" }).click()

  // 12 champs à compléter : 8 du formulaire (identité, niveau, fréquence de paiement, 2 cases
  // d'acceptation — l'année, en lecture seule, est exclue) + 4 du tuteur principal (relation, nom,
  // téléphone, e-mail). La relation a son propre message, d'où 11 « Ce champ est requis ».
  await expect(page.getByText('Veuillez compléter les 12 champs obligatoires')).toBeVisible()
  await expect(errors).toHaveCount(11)
  await expect(page.getByText("Choisissez la relation avec l'élève")).toBeVisible()
  await expect(page).toHaveURL(`/portal/register/${E2E_SCHOOL.slug}`)

  // L'erreur d'un champ disparaît dès qu'il est rempli
  await field(page, "Prénom de l'étudiant").fill('Partiel')
  await page.getByRole('button', { name: 'Masculin' }).click()
  await page.getByRole('checkbox', { name: /J'ai lu et j'accepte le règlement intérieur/ }).check()
  await expect(errors).toHaveCount(8)

  await page.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(page.getByText('Veuillez compléter les 9 champs obligatoires')).toBeVisible()

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
