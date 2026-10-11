import { test, expect } from '../support/fixtures'
import { storageStatePath, ARCHIVED_CLASS } from '../support/users'

// Historique des bulletins côté parent (§7.20) : un bulletin d'une année passée reste visible après
// que l'enfant a quitté la classe (badge « Classe quittée »), via le filtre par année, en lecture
// seule. L'année en cours, elle, n'a rien à montrer. Lecture seule : le test peut tourner en parallèle.
// Sami (enfant du compte « family ») : bulletin T1 d'archive posé par le seed.

test.use({ storageState: storageStatePath('family') })

test('bulletin d\'une année passée : visible avec « Classe quittée », sans signature', async ({ page }) => {
  await page.goto('/parent-portal/exams')

  // Année en cours : aucun bulletin ; l'année passée est proposée dans le filtre
  await expect(page.getByText('Aucune note disponible')).toBeVisible()
  const years = page.getByLabel('Année scolaire')
  await expect(years.locator('option')).toContainText([ARCHIVED_CLASS.year])

  // Année passée : consultation seulement
  await years.selectOption(ARCHIVED_CLASS.year)
  await expect(page.getByText('Autre année scolaire — consultation seulement')).toBeVisible()
  await page.getByRole('button', { name: 'T1', exact: true }).click()

  const bulletin = page.locator('div.rounded-xl').filter({ hasText: ARCHIVED_CLASS.name }).filter({ hasText: 'Signature du parent' })
  await expect(bulletin).toContainText('Classe quittée')
  await expect(bulletin).toContainText(`${ARCHIVED_CLASS.score}/100`)
  await expect(bulletin).toContainText("Bon trimestre d'archive.")
  await expect(bulletin.getByRole('button', { name: 'Signer avec mon nom' })).toHaveCount(0)
  await expect(page.getByText("Période d'examens fermée — signature indisponible")).toHaveCount(0)

  // Un autre trimestre de cette année n'a pas de bulletin
  await page.getByRole('button', { name: 'T2', exact: true }).click()
  await expect(page.getByText(ARCHIVED_CLASS.name)).toHaveCount(0)
})
