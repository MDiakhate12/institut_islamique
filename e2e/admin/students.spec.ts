import { test, expect } from '../support/fixtures'
import { storageStatePath } from '../support/users'

test.use({ storageState: storageStatePath('admin') })

test.describe('élèves (admin)', () => {
  test('le formulaire de création exige prénom et nom', async ({ page }) => {
    await page.goto('/admin-portal/students')
    await page.getByRole('button', { name: 'Créer un nouvel élève' }).click()
    const sheet = page.getByRole('dialog', { name: 'Ajouter un nouvel élève' })
    await sheet.getByRole('button', { name: "Créer l'élève" }).click()

    await expect(sheet.getByText('Le prénom est requis')).toBeVisible()
    await expect(sheet.getByText('Le nom est requis')).toBeVisible()
    await expect(sheet).toBeVisible() // rien n'a été soumis
  })

  test('créer, modifier puis supprimer un élève', async ({ page }) => {
    await page.goto('/admin-portal/students')
    const search = page.getByPlaceholder(/Rechercher des élèves/)
    const rowOf = (text: string) => page.getByRole('row').filter({ hasText: text })

    // Création
    await page.getByRole('button', { name: 'Créer un nouvel élève' }).click()
    const createSheet = page.getByRole('dialog', { name: 'Ajouter un nouvel élève' })
    await createSheet.getByPlaceholder('Prénom').fill('Amina')
    await createSheet.getByPlaceholder('Nom', { exact: true }).fill('crudtest')
    await expect(createSheet.getByPlaceholder('Nom', { exact: true })).toHaveValue('CRUDTEST')
    await createSheet.locator('select[name="gender"]').selectOption('female')
    await createSheet.getByRole('button', { name: "Créer l'élève" }).click()

    await expect(page.getByText('Élève créé avec succès')).toBeVisible()
    await expect(createSheet).toBeHidden()
    await search.fill('CRUDTEST')
    await expect(rowOf('Amina')).toBeVisible()

    // Modification (clic sur la ligne → tiroir d'édition)
    await rowOf('Amina').click()
    const editSheet = page.getByRole('dialog', { name: "Modifier l'élève" })
    await expect(editSheet.getByPlaceholder('Prénom')).toHaveValue('Amina')
    await editSheet.getByPlaceholder('Prénom').fill('Aminata')
    await editSheet.getByRole('button', { name: 'Enregistrer les modifications' }).click()

    await expect(page.getByText('Élève modifié avec succès')).toBeVisible()
    await expect(editSheet).toBeHidden()
    await expect(rowOf('Aminata')).toBeVisible()

    // Suppression (avec confirmation)
    await rowOf('Aminata').click()
    await editSheet.getByRole('button', { name: "Supprimer l'élève" }).click()
    await page.getByRole('dialog').filter({ hasText: 'Cette action est irréversible' })
      .getByRole('button', { name: 'Supprimer', exact: true }).click()

    await expect(page.getByText('Élève supprimé')).toBeVisible()
    await expect(rowOf('CRUDTEST')).toHaveCount(0)
  })
})
