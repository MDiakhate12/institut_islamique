import { test, expect } from '../support/fixtures'
import { storageStatePath, E2E_SCHOOL, E2E_EMAIL_DOMAIN } from '../support/users'

// §7.8 — l'admin crée un enseignant (school_members avec user_id = NIL_UUID + pendingEmail),
// l'enseignant crée son compte (signUpAction rattache son user au record existant), voit la
// gate d'activation et saisit son code (= school_members.id, copié par l'admin).

test('activation d\'un enseignant créé par l\'admin', async ({ browser }) => {
  const errors: Error[] = []
  const admin = await browser.newPage({
    storageState: storageStatePath('admin'),
    permissions: ['clipboard-read', 'clipboard-write'], // « Copier l'ID » écrit dans le presse-papier
  })
  const teacher = await browser.newPage() // visiteur non connecté
  for (const p of [admin, teacher]) p.on('pageerror', e => errors.push(new Error(`${p.url()} : ${e.message.slice(0, 40)}`)))

  // E-mail unique : un retry ne doit pas tomber sur le compte d'une tentative précédente
  const email = `nouveau.prof.${Date.now()}@${E2E_EMAIL_DOMAIN}`
  const password = `E2e-${Date.now()}!`

  // 1. Admin : crée l'enseignant, qui reste « En attente », et copie son code
  await admin.goto('/admin-portal/teachers')
  await admin.getByRole('button', { name: 'Créer un nouvel enseignant' }).click()
  const dialog = admin.getByRole('dialog', { name: 'Ajouter un nouvel enseignant' })
  await dialog.getByPlaceholder('Entrez le nom complet').fill('Nadia PROF')
  await dialog.getByPlaceholder("Entrez l'email").fill(email)
  await dialog.getByRole('button', { name: "Créer l'enseignant" }).click()
  await expect(admin.getByText('Invitation envoyée avec succès')).toBeVisible()
  await expect(dialog).toBeHidden()

  const card = admin.locator('div.rounded-xl').filter({ hasText: email })
  await expect(card).toContainText('En attente')
  await card.getByTitle("Copier l'ID").click()
  const code = await admin.evaluate(() => navigator.clipboard.readText())
  expect(code).toMatch(/^[0-9a-f-]{36}$/)

  // 2. Enseignant : crée son compte depuis l'inscription publique
  await teacher.goto('/auth/signup')
  await teacher.getByPlaceholder('Prénom Nom').fill('Nadia PROF')
  await teacher.getByPlaceholder('votre@email.com').fill(email)
  await teacher.getByRole('combobox').click()
  await teacher.getByRole('option', { name: E2E_SCHOOL.name }).click()
  await teacher.getByPlaceholder('0X XX XX XX XX').fill('0612345678')
  await teacher.getByRole('button', { name: 'Inscription parent' }).click() // coché par défaut
  await teacher.getByRole('button', { name: 'Inscription enseignant' }).click()
  await teacher.getByPlaceholder('••••••••').first().fill(password)
  await teacher.getByPlaceholder('••••••••').last().fill(password)
  await teacher.getByRole('checkbox').check()
  await teacher.getByRole('button', { name: 'Créer un compte' }).click()

  // 3. Gate d'activation : un code erroné est refusé, le bon ouvre le portail
  await expect(teacher).toHaveURL(/\/teacher-portal/)
  await expect(teacher.getByRole('heading', { name: "Vérification de l'enseignant" })).toBeVisible()
  const codeInput = teacher.getByPlaceholder('Entrez votre identifiant enseignant')
  const verify = teacher.getByRole('button', { name: "Vérifier l'identité →" })

  await codeInput.fill('00000000-0000-0000-0000-000000000001')
  await verify.click()
  await expect(teacher.getByText(/^Code invalide/)).toBeVisible()

  await codeInput.fill(code)
  await verify.click()
  await expect(teacher).toHaveURL('/teacher-portal/homework')
  await expect(teacher.getByRole('heading', { name: 'Gestion des devoirs' })).toBeVisible()

  // 4. Admin : l'enseignant est désormais actif
  await admin.reload()
  await expect(card).toContainText('Active')
  await expect(card).not.toContainText('En attente')

  expect(errors).toEqual([])
  await Promise.all([admin.close(), teacher.close()])
})
