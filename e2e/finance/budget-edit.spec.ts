import { test, expect } from '../support/fixtures'
import { storageStatePath } from '../support/users'

// Budget (admin) : création puis modification d'un paiement. Couvre le mode édition de
// PaymentFormDialog (formulaire pré-rempli via `values`, dialogue ouvert par le paiement édité)
// et sa réinitialisation : après une modification, « Enregistrer un revenu » repart vide.

test.use({ storageState: storageStatePath('admin') })

test('budget : créer puis modifier un paiement', async ({ page }) => {
  const parentName = `Parent Budget ${Date.now()}` // unique : la base est partagée par les tests du run
  const row = page.getByRole('row').filter({ hasText: parentName })

  await page.goto('/admin-portal/finance/budget')

  // Création
  await page.getByRole('button', { name: 'Enregistrer un revenu' }).click()
  const create = page.getByRole('dialog', { name: 'Ajouter un nouveau paiement' })
  await create.getByRole('button', { name: 'Sélectionner des étudiants...' }).click()
  // Sami (enfant du compte « family ») et non Yassine : un paiement sur Yassine ferait passer son
  // trimestre à « Payé » et casserait le test parent-payment qui tourne en parallèle
  await page.getByRole('button', { name: 'Sami ENFANT' }).click()
  await page.keyboard.press('Escape') // ferme le popover de sélection, pas le dialogue
  await create.getByPlaceholder('Nom du parent').fill(parentName)
  await create.locator('input[name="amount"]').fill('123.45')
  await create.getByRole('button', { name: 'Ajouter le paiement' }).click()
  await expect(page.getByText('Paiement enregistré avec succès !')).toBeVisible()
  await expect(create).toBeHidden()
  await expect(row).toContainText('123,45')

  // Modification : le formulaire est pré-rempli avec le paiement
  await row.getByRole('button', { name: 'Modifier' }).click()
  const edit = page.getByRole('dialog', { name: 'Modifier le paiement' })
  await expect(edit.getByPlaceholder('Nom du parent')).toHaveValue(parentName)
  await expect(edit.locator('input[name="amount"]')).toHaveValue('123.45')
  await edit.locator('input[name="amount"]').fill('150')
  await edit.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(page.getByText('Paiement modifié avec succès !')).toBeVisible()
  await expect(edit).toBeHidden()
  await expect(row).toContainText('150,00')

  // Le formulaire de création repart vide (pas de reste du paiement édité)
  await page.getByRole('button', { name: 'Enregistrer un revenu' }).click()
  await expect(page.getByRole('dialog', { name: 'Ajouter un nouveau paiement' }).getByPlaceholder('Nom du parent')).toHaveValue('')
})
