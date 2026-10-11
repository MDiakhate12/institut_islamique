import { test, expect } from '../support/fixtures'
import { storageStatePath } from '../support/users'

// §7.4 — supprimer un champ du formulaire d'inscription ne masque jamais les réponses déjà reçues
// (constat 2026-10 : le téléphone de la mère de 163 élèves avait disparu de la fiche élève).
// Seed : Nora ARCHIVE a répondu à deux champs supprimés depuis, l'un avec son libellé archivé.

test.use({ storageState: storageStatePath('admin') })

test('les réponses à des champs supprimés du formulaire restent dans la fiche élève', async ({ page }) => {
  await page.goto('/admin-portal/students')
  await page.getByPlaceholder(/Rechercher des élèves/).fill('ARCHIVE')
  await page.getByRole('row').filter({ hasText: 'Nora' }).click()

  const sheet = page.getByRole('dialog', { name: "Modifier l'élève" })
  await sheet.getByRole('button', { name: /Données de l'inscription/ }).click()

  // Libellé archivé à l'enregistrement du formulaire
  await expect(sheet.getByText('Téléphone de la mère')).toBeVisible()
  await expect(sheet.getByText('0611223344')).toBeVisible()
  // Champ supprimé avant l'archivage des libellés : libellé de repli, réponse quand même affichée
  await expect(sheet.getByText('Champ supprimé du formulaire (cf-e2e-unlabelled)')).toBeVisible()
  await expect(sheet.getByText('Réponse sans libellé')).toBeVisible()
  await expect(sheet.getByText('Supprimé du formulaire', { exact: true })).toHaveCount(2)
})

test('supprimer un champ qui a déjà des réponses demande confirmation', async ({ page }) => {
  await page.goto('/admin-portal/registration-forms')
  const label = "J'ai lu et accepte les politiques et les directives ci-dessus"
  const deleteButton = page.getByRole('button', { name: `Supprimer le champ « ${label} »` })

  // Le seed garantit au moins une réponse (Nora ARCHIVE) : la confirmation s'affiche toujours —
  // même avant le chargement des compteurs, sinon le champ serait supprimé et enregistré aussitôt
  await deleteButton.click()
  const dialog = page.getByRole('dialog', { name: `Supprimer le champ « ${label} » ?` })
  await expect(dialog).toContainText(/déjà répondu/)
  await expect(dialog).toContainText('Supprimé du formulaire')

  // Annuler : le champ reste dans le formulaire (rien n'est enregistré)
  await dialog.getByRole('button', { name: 'Annuler' }).click()
  await expect(dialog).toBeHidden()
  await expect(deleteButton).toBeAttached()
})
