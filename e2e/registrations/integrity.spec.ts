import { test, expect } from '../support/fixtures'
import { storageStatePath, E2E_SCHOOL, E2E_CLOSED_SCHOOL, E2E_USERS } from '../support/users'
import { fillNewStudentForm, uniqueSuffix } from '../support/registration-form'

// Intégrité des inscriptions (§7.4) : nouvel élève inactif jusqu'à l'approbation puis inscrit dans
// la classe choisie, doublons refusés, réinscription publique renvoyée vers le portail parent,
// inscriptions fermées respectées, retour à la page demandée après connexion.

test('nouvel élève : « En attente » jusqu\'à l\'approbation, puis inscrit dans la classe choisie', async ({ browser }) => {
  const family = await browser.newPage({ storageState: storageStatePath('family') })
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  const errors: Error[] = []
  for (const p of [family, admin]) p.on('pageerror', e => errors.push(e))
  const first = `Nour${uniqueSuffix()}`
  const name = `${first} CLASSE`

  // Parent : nouvel élève avec choix de la classe
  await family.goto('/parent-portal/enrollment/new')
  await fillNewStudentForm(family, { firstName: first, lastName: 'classe', father: 'Famille E2E', mother: 'Maman E2E', className: 'Classe Coran E2E' })
  await family.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(family).toHaveURL('/parent-portal/enrollment/success')

  // Admin : l'élève existe mais n'est pas encore « Inscrit », et n'a pas de classe
  const studentRow = admin.getByRole('row').filter({ hasText: first })
  await admin.goto('/admin-portal/students')
  await admin.getByPlaceholder(/Rechercher des élèves/).fill(first)
  await expect(studentRow).toContainText('En attente')
  await expect(studentRow).not.toContainText('Classe Coran E2E')

  // Approbation → élève actif et inscrit dans la classe choisie
  await admin.goto('/admin-portal/registrations')
  await admin.getByRole('row').filter({ hasText: name }).click()
  await admin.locator('section').filter({ hasText: 'Décision' }).getByRole('button', { name: 'Approuver' }).click()
  await expect(admin.getByText('Inscription approuvée')).toBeVisible()

  await admin.goto('/admin-portal/students')
  await admin.getByPlaceholder(/Rechercher des élèves/).fill(first)
  await expect(studentRow).toContainText('Inscrit')
  await expect(studentRow).toContainText('Classe Coran E2E')

  expect(errors).toEqual([])
  await Promise.all([family.close(), admin.close()])
})

test.describe('doublons', () => {
  test('le parent ne peut pas inscrire deux fois le même enfant', async ({ browser }) => {
    const family = await browser.newPage({ storageState: storageStatePath('family') })
    const first = `Adam${uniqueSuffix()}`
    for (let i = 0; i < 2; i++) {
      await family.goto('/parent-portal/enrollment/new')
      await fillNewStudentForm(family, { firstName: first, lastName: 'double', birthDate: '2016-11-02', father: 'Famille E2E', mother: 'Maman E2E' })
      await family.getByRole('button', { name: "Soumettre l'inscription" }).click()
      if (i === 0) await expect(family).toHaveURL('/parent-portal/enrollment/success')
    }
    await expect(family.getByText(/Cet enfant est déjà lié à votre compte/)).toBeVisible()
    await expect(family).toHaveURL('/parent-portal/enrollment/new')
    await family.close()
  })

  test('le formulaire public refuse un élève déjà inscrit à l\'école', async ({ page }) => {
    // Yassine TESTEUR, né le 12/04/2015, existe dans le seed
    await page.goto(`/portal/register/${E2E_SCHOOL.slug}`)
    await fillNewStudentForm(page, {
      firstName: 'Yassine', lastName: 'testeur', birthDate: '2015-04-12',
      father: 'Un PÈRE', mother: 'Une MÈRE', email: 'inconnu@example.com',
    })
    await page.getByRole('button', { name: "Soumettre l'inscription" }).click()
    await expect(page.getByText(/déjà inscrit à l'école/)).toBeVisible()
    await expect(page).toHaveURL(`/portal/register/${E2E_SCHOOL.slug}`)
  })
})

test('la réinscription publique renvoie vers le portail parent', async ({ page }) => {
  await page.goto(`/portal/register/${E2E_SCHOOL.slug}/reenroll`)
  await expect(page.getByRole('heading', { name: 'Réinscription depuis le portail parent' })).toBeVisible()
  await expect(page.getByRole('button', { name: "Soumettre l'inscription" })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/auth/login?redirect=/parent-portal/enrollment')
})

test('inscriptions fermées : le formulaire n\'est plus proposé', async ({ page }) => {
  await page.goto(`/portal/register/${E2E_CLOSED_SCHOOL.slug}`)
  await expect(page.getByRole('heading', { name: 'Inscriptions fermées' })).toBeVisible()
  await expect(page.getByRole('button', { name: "Soumettre l'inscription" })).toHaveCount(0)
})

test('après connexion, retour à la page demandée', async ({ page }) => {
  await page.goto('/parent-portal/enrollment')
  await expect(page).toHaveURL(/\/auth\/login\?redirect=/)
  await page.getByPlaceholder('votre@email.com').fill(E2E_USERS.family.email)
  await page.locator('input[name="password"]').fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL('/parent-portal/enrollment')
})
