import { test, expect } from '../support/fixtures'
import { storageStatePath, E2E_SCHOOL, E2E_EMAIL_DOMAIN } from '../support/users'
import { inviteLink } from '../support/invite'

// §7.8 — un enseignant invité qui suit son lien signé est activé directement : pas de gate ni de code.
// Les anciens liens (?invite=…&email=…) ne prouvent rien : pour l'admin ils n'ouvrent plus rien.

test('enseignant invité : le lien signé active le compte sans code', async ({ browser }) => {
  const admin = await browser.newPage({ storageState: storageStatePath('admin') })
  const teacher = await browser.newPage()

  const email = `prof.lien.${Date.now()}@${E2E_EMAIL_DOMAIN}`
  const password = `E2e-${Date.now()}!`

  await admin.goto('/admin-portal/teachers')
  await admin.getByRole('button', { name: 'Créer un nouvel enseignant' }).click()
  const dialog = admin.getByRole('dialog', { name: 'Ajouter un nouvel enseignant' })
  await dialog.getByPlaceholder('Entrez le nom complet').fill('Samir LIEN')
  await dialog.getByPlaceholder("Entrez l'email").fill(email)
  await dialog.getByRole('button', { name: "Créer l'enseignant" }).click()
  await expect(admin.getByText('Invitation envoyée avec succès')).toBeVisible()

  await teacher.goto(await inviteLink('teacher', E2E_SCHOOL.slug, email))
  await expect(teacher.getByText('Invitation enseignant')).toBeVisible()
  await expect(teacher.getByPlaceholder('votre@email.com')).toHaveValue(email)
  await teacher.getByPlaceholder('0X XX XX XX XX').fill('0612345678')
  await teacher.getByPlaceholder('••••••••').first().fill(password)
  await teacher.getByPlaceholder('••••••••').last().fill(password)
  await teacher.getByRole('checkbox').check()
  await teacher.getByRole('button', { name: 'Créer un compte' }).click()

  // Aucune gate : le portail s'ouvre
  await expect(teacher).toHaveURL('/teacher-portal/homework')
  await expect(teacher.getByRole('heading', { name: 'Gestion des devoirs' })).toBeVisible()

  // Côté admin : actif, jamais passé par « En attente »
  await admin.reload()
  const card = admin.locator('div.rounded-xl').filter({ hasText: email })
  await expect(card).toContainText('Active')

  await Promise.all([admin.close(), teacher.close()])
})

test('lien d\'invitation admin forgé ou falsifié : refusé', async ({ page }) => {
  // Ancien format : fabricable par quiconque connaît l'école et l'e-mail
  await page.goto(`/auth/signup?invite=admin&schoolId=00000000-0000-0000-0000-000000000001&email=${encodeURIComponent('victime@e2e.qaf.test')}`)
  await expect(page.getByRole('heading', { name: 'Invitation invalide ou expirée' })).toBeVisible()

  // Jeton valide dont la signature est altérée
  const link = await inviteLink('admin', E2E_SCHOOL.slug, `nouveau.admin.${Date.now()}@${E2E_EMAIL_DOMAIN}`)
  await page.goto(link.slice(0, -2) + 'xx')
  await expect(page.getByRole('heading', { name: 'Invitation invalide ou expirée' })).toBeVisible()
})
