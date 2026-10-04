import { test, expect } from '../support/fixtures'
import { storageStatePath, E2E_SCHOOL, E2E_CLOSED_SCHOOL, E2E_TWO_GUARDIANS_SCHOOL, E2E_USERS } from '../support/users'
import { fillGuardians, fillNewStudentForm, uniqueSuffix } from '../support/registration-form'

// Intégrité des inscriptions (§7.4) : nouvel élève inactif jusqu'à l'approbation puis inscrit dans
// la classe choisie, doublons refusés, réinscription publique renvoyée vers le portail parent,
// inscriptions fermées respectées, retour à la page demandée après connexion.

test('nouvel élève : absent du tableau Élèves jusqu\'à l\'approbation, puis inscrit dans la classe choisie', async ({ browser }) => {
  const family = await browser.newPage({ storageState: storageStatePath('family') })
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  const errors: Error[] = []
  for (const p of [family, admin]) p.on('pageerror', e => errors.push(e))
  const first = `Nour${uniqueSuffix()}`
  const name = `${first} CLASSE`

  // Parent : nouvel élève avec choix de la classe
  await family.goto('/parent-portal/enrollment/new')
  await fillNewStudentForm(family, { firstName: first, lastName: 'classe', className: 'Classe Coran E2E' })
  await fillGuardians(family)
  await family.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(family).toHaveURL('/parent-portal/enrollment/success')

  // Admin : tant que l'inscription n'est pas approuvée, l'enfant n'est pas dans le tableau Élèves
  const studentRow = admin.getByRole('row').filter({ hasText: first })
  await admin.goto('/admin-portal/students')
  await admin.getByPlaceholder(/Rechercher des élèves/).fill(first)
  await expect(admin.getByText('0 élèves', { exact: true })).toBeVisible()
  await expect(studentRow).toHaveCount(0)

  // Approbation → élève actif et inscrit dans la classe choisie
  await admin.goto('/admin-portal/registrations')
  await admin.getByRole('row').filter({ hasText: name }).click()
  await admin.locator('section').filter({ hasText: 'Décision' }).getByRole('button', { name: 'Approuver' }).click()
  await expect(admin.getByText('Inscription approuvée')).toBeVisible()

  await admin.goto('/admin-portal/students')
  await admin.getByPlaceholder(/Rechercher des élèves/).fill(first)
  await expect(studentRow).toContainText('Actif')
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
      await fillNewStudentForm(family, { firstName: first, lastName: 'double', birthDate: '2016-11-02' })
      await fillGuardians(family)
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
    await fillNewStudentForm(page, { firstName: 'Yassine', lastName: 'testeur', birthDate: '2015-04-12' })
    await fillGuardians(page, { relation: 'Père', name: 'Un PÈRE', email: 'inconnu@example.com' })
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

test('bloc « Tuteurs » : validation, second tuteur, tuteur 1 rattaché au compte', async ({ browser }) => {
  const family = await browser.newPage({ storageState: storageStatePath('family') })
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  const first = `Ines${uniqueSuffix()}`

  await family.goto('/parent-portal/enrollment/new')
  await fillNewStudentForm(family, { firstName: first, lastName: 'tuteurs', gender: 'Féminin' })

  // Relation et téléphone du tuteur 1 non renseignés → erreurs sous les champs, rien n'est envoyé
  await family.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(family.getByText("Choisissez la relation avec l'élève")).toBeVisible()
  await expect(family).toHaveURL('/parent-portal/enrollment/new')

  // Mère + second tuteur : « Mère » n'est plus proposé pour lui, il est pré-réglé sur « Père »
  await fillGuardians(family, { relation: 'Mère', second: { relation: 'Père', name: 'Papa TUTEURS', phone: '0611223344' } })
  await expect(family.locator('#guardian-1-relationship option[value="mother"]')).toBeDisabled()
  await expect(family.getByText("Choisissez la relation avec l'élève")).toHaveCount(0)
  await family.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(family).toHaveURL('/parent-portal/enrollment/success')

  // Admin : approuve l'inscription (l'élève n'entre qu'alors dans le tableau Élèves), puis ouvre
  // sa fiche : les deux tuteurs, le parent connecté marqué « Compte lié »
  await admin.goto('/admin-portal/registrations')
  await admin.getByRole('row').filter({ hasText: first }).click()
  await admin.locator('section').filter({ hasText: 'Décision' }).getByRole('button', { name: 'Approuver' }).click()
  await expect(admin.getByText('Inscription approuvée')).toBeVisible()
  await admin.goto('/admin-portal/students')
  await admin.getByPlaceholder(/Rechercher des élèves/).fill(first)
  await admin.getByRole('row').filter({ hasText: first }).click()
  const sheet = admin.getByRole('dialog', { name: "Modifier l'élève" })
  const linked = sheet.locator('div').filter({ hasText: 'Compte lié' }).filter({ hasText: 'Mère' }).last()
  await expect(linked).toContainText(E2E_USERS.family.fullName)
  await expect(sheet.getByText('Papa TUTEURS')).toBeVisible()

  await Promise.all([family.close(), admin.close()])
})

test('constructeur admin : les champs parents/contact apparaissent comme le bloc « Tuteurs »', async ({ browser }) => {
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  await admin.goto('/admin-portal/registration-forms')
  await expect(admin.getByText('Tuteur principal obligatoire (nom, téléphone, e-mail)')).toBeVisible()
  await expect(admin.getByText('Nom du père ou du tuteur')).toHaveCount(0)
  await expect(admin.getByText('Téléphone principal')).toHaveCount(0)
  await admin.close()
})

test('réglage « Second tuteur obligatoire » : le formulaire exige le second tuteur et son e-mail', async ({ page }) => {
  await page.goto(`/portal/register/${E2E_TWO_GUARDIANS_SCHOOL.slug}`)
  // Carte du second tuteur affichée d'office, sans « Retirer » ni bouton d'ajout
  await expect(page.locator('#guardian-1-name')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retirer' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Ajouter un second tuteur/ })).toHaveCount(0)

  await fillNewStudentForm(page, { firstName: `Sara${uniqueSuffix()}`, lastName: 'deuxtuteurs' })
  await fillGuardians(page, { relation: 'Mère', name: 'Mère DEUXTUTEURS', email: 'mere@example.com' })

  // Second tuteur incomplet → refus : nom et e-mail exigés (le téléphone, non exigé ici, ne l'est pas)
  await page.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(page.getByText('Veuillez compléter les 2 champs obligatoires')).toBeVisible()
  await expect(page.locator('#guardian-1-relationship')).toHaveValue('father') // relation complémentaire pré-choisie

  await page.locator('#guardian-1-name').fill('Père DEUXTUTEURS')
  await page.locator('#guardian-1-email').fill('pere@example.com')
  await page.getByRole('button', { name: "Soumettre l'inscription" }).click()
  await expect(page).toHaveURL(`/portal/register/${E2E_TWO_GUARDIANS_SCHOOL.slug}/success`)
})

test('constructeur : la case « Second tuteur obligatoire » met à jour l\'aperçu', async ({ browser }) => {
  // Coché puis décoché en moins de 1,2 s (délai de l'auto-sauvegarde) : le formulaire partagé
  // par les autres tests n'est pas modifié
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  await admin.goto('/admin-portal/registration-forms')
  const toggle = admin.getByRole('checkbox', { name: 'Second tuteur obligatoire' })
  // Ordre : carte du tuteur principal, bouton « Ajouter un second tuteur », puis les réglages
  const addButton = admin.getByRole('button', { name: /Ajouter un second tuteur/, includeHidden: true })
  const principalBox = await admin.getByText('Tuteur principal', { exact: true }).boundingBox()
  const addBox = await addButton.boundingBox()
  const toggleBox = await toggle.boundingBox()
  expect(addBox!.y).toBeGreaterThan(principalBox!.y)
  expect(toggleBox!.y).toBeGreaterThan(addBox!.y)
  // Coché : le bouton d'ajout disparaît
  await toggle.check()
  await expect(admin.getByRole('checkbox', { name: 'Son e-mail est obligatoire' })).toBeVisible()
  await expect(addButton).toHaveCount(0)
  await expect(admin.getByText('second tuteur obligatoire.')).toBeVisible()
  await toggle.uncheck()
  await expect(admin.getByRole('checkbox', { name: 'Son e-mail est obligatoire' })).toHaveCount(0)
  await admin.close()
})
