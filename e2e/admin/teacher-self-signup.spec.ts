import { test, expect } from '../support/fixtures'
import { storageStatePath, E2E_SCHOOL, E2E_EMAIL_DOMAIN } from '../support/users'

// Auto-inscription enseignant : le compte est créé désactivé (gate), l'admin est prévenu puis
// l'active en un clic depuis la page Enseignants — l'enseignant n'a aucun code à saisir.

test('enseignant auto-inscrit : désactivé, l\'admin l\'active, le portail s\'ouvre', async ({ browser }) => {
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  const teacher = await browser.newPage()

  const email = `prof.auto.${Date.now()}@${E2E_EMAIL_DOMAIN}`
  const password = `E2e-${Date.now()}!`
  const fullName = `Karim AUTO${Date.now() % 100000}`

  // 1. Inscription depuis la page publique, rôle enseignant
  await teacher.goto(`/auth/signup?school=${E2E_SCHOOL.slug}`)
  await teacher.getByPlaceholder('Prénom Nom').fill(fullName)
  await teacher.getByPlaceholder('votre@email.com').fill(email)
  await teacher.getByPlaceholder('0X XX XX XX XX').fill('0612345678')
  await teacher.getByRole('button', { name: 'Inscription parent' }).click() // coché par défaut
  await teacher.getByRole('button', { name: 'Inscription enseignant' }).click()
  await teacher.getByPlaceholder('••••••••').first().fill(password)
  await teacher.getByPlaceholder('••••••••').last().fill(password)
  await teacher.getByRole('checkbox').check()
  await teacher.getByRole('button', { name: 'Créer un compte' }).click()

  // 2. Compte désactivé : la gate explique l'attente de l'admin
  await expect(teacher).toHaveURL(/\/teacher-portal/)
  await expect(teacher.getByText("Compte en attente d'activation")).toBeVisible()

  // 3. L'admin est prévenu (cloche) et active l'enseignant
  await admin.goto('/admin-portal/teachers')
  const card = admin.locator('div.rounded-xl').filter({ hasText: email })
  await expect(card).toContainText('En attente')
  await card.getByRole('button', { name: 'Activer' }).click()
  await expect(admin.getByText('Enseignant activé')).toBeVisible()
  await expect(card).toContainText('Active')

  // 4. L'enseignant accède au portail sans code
  await teacher.reload()
  await expect(teacher.getByText("Compte en attente d'activation")).toBeHidden()
  await teacher.goto('/teacher-portal/homework')
  await expect(teacher.getByRole('heading', { name: 'Gestion des devoirs' })).toBeVisible()

  await Promise.all([admin.close(), teacher.close()])
})
