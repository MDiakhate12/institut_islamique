import { test, expect, type Page } from '../support/fixtures'
import { storageStatePath, E2E_USERS } from '../support/users'

// §7.13 — l'enseignant soumet un remboursement (/teacher-portal/refunds, ExpenseFormDialog partagé),
// l'admin le traite depuis Dépenses (approuver → payer, ou rejeter), l'enseignant voit le statut.

/** Carte d'une demande de remboursement (même rendu côté enseignant et admin). */
const refundCard = (page: Page, description: string) =>
  page.locator('div.rounded-xl.border.p-4').filter({ hasText: description })

async function submitRefund(teacher: Page, description: string, amount: string) {
  await teacher.getByRole('button', { name: 'Nouveau remboursement' }).click()
  const dialog = teacher.getByRole('dialog', { name: 'Nouvelle dépense' })
  await dialog.getByRole('combobox').click()
  await teacher.getByRole('option', { name: 'Fournitures' }).click()
  await dialog.locator('input[name="amount"]').fill(amount)
  await dialog.getByPlaceholder(/Livres pour la Classe A/).fill(description)
  await dialog.getByRole('button', { name: 'Soumettre la demande' }).click()
  await expect(teacher.getByText('Demande de remboursement soumise avec succès')).toBeVisible()
  await expect(dialog).toBeHidden()
}

/** Ouvre une page par rôle et collecte ses exceptions JS (la fixture auto ne voit pas ces pages). */
async function openAs(browser: import('@playwright/test').Browser, role: 'teacher' | 'admin', errors: Error[]) {
  const page = await browser.newPage({ storageState: storageStatePath(role) })
  page.on('pageerror', e => errors.push(new Error(`${page.url()} : ${e.message.slice(0, 40)}`)))
  return page
}

test.use({ storageState: storageStatePath('teacher') })

test('le formulaire de remboursement exige un montant et une description', async ({ page }) => {
  await page.goto('/teacher-portal/refunds')
  await page.getByRole('button', { name: 'Nouveau remboursement' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nouvelle dépense' })
  await dialog.getByRole('button', { name: 'Soumettre la demande' }).click()

  await expect(dialog.getByText('Le montant doit être supérieur à 0')).toBeVisible()
  await expect(dialog.getByText('Description requise')).toBeVisible()
  await expect(dialog).toBeVisible() // rien n'a été soumis
})

test('remboursement soumis par l\'enseignant, approuvé puis payé par l\'admin', async ({ browser }) => {
  const errors: Error[] = []
  const teacher = await openAs(browser, 'teacher', errors)
  const admin = await openAs(browser, 'admin', errors)
  const description = `Cahiers Classe Coran (E2E ${Date.now()})`

  // 1. Enseignant : la demande part « En attente »
  await teacher.goto('/teacher-portal/refunds')
  await submitRefund(teacher, description, '42.30')
  await expect(refundCard(teacher, description)).toContainText('En attente')
  await expect(refundCard(teacher, description)).toContainText('42,30')

  // 2. Admin : la retrouve avec le nom du soumetteur, l'approuve puis la marque payée
  await admin.goto('/admin-portal/finance/expenses')
  const card = refundCard(admin, description)
  await expect(card).toContainText(E2E_USERS.teacher.fullName)
  await expect(card).toContainText('Fournitures')
  await card.getByRole('button', { name: 'Approuver' }).click()
  await expect(admin.getByText('Remboursement approuvé avec succès')).toBeVisible()
  await expect(card).toContainText('Approuvé')

  await card.getByRole('button', { name: 'Marquer comme payé' }).click()
  await expect(admin.getByText('Remboursement marqué comme payé')).toBeVisible()
  await expect(card).toContainText('Payé')
  await expect(card.getByRole('button')).toHaveCount(0) // plus aucune action sur une demande payée

  // 3. Enseignant : la demande est payée
  await teacher.reload()
  await expect(refundCard(teacher, description)).toContainText('Payé')

  expect(errors).toEqual([])
  await Promise.all([teacher.close(), admin.close()])
})

test('remboursement rejeté par l\'admin', async ({ browser }) => {
  const errors: Error[] = []
  const teacher = await openAs(browser, 'teacher', errors)
  const admin = await openAs(browser, 'admin', errors)
  const description = `Goûter de fin de trimestre (E2E ${Date.now()})`

  await teacher.goto('/teacher-portal/refunds')
  await submitRefund(teacher, description, '15')

  await admin.goto('/admin-portal/finance/expenses')
  const card = refundCard(admin, description)
  await card.getByRole('button', { name: 'Rejeter' }).click()
  const confirm = admin.getByRole('dialog', { name: 'Rejeter la demande' })
  await confirm.getByRole('button', { name: 'Rejeter' }).click()
  await expect(admin.getByText('Remboursement rejeté', { exact: true })).toBeVisible()
  await expect(card).toContainText('Rejeté')

  await teacher.reload()
  await expect(refundCard(teacher, description)).toContainText('Rejeté')

  expect(errors).toEqual([])
  await Promise.all([teacher.close(), admin.close()])
})
